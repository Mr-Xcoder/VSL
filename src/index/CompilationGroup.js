import PropogateModifierTraverser, { Behavior as p } from './PropogateModifierTraverser';

import CompilationStream from './CompilationStream';

import ParserError from '../vsl/parser/parserError';
import VSLParser from '../vsl/parser/vslparser';

import TransformationContext from '../vsl/transform/transformationContext';
import VSLPreprocessor from '../vsl/transform/transformers/vslpreprocessor';
import VSLTransformer from '../vsl/transform/transformers/vsltransformer';
import TransformError from '../vsl/transform/transformError';
import { CodeBlock } from '../vsl/parser/nodes/*';

import e from '../vsl/errors'

/**
 * Represents the compilation of a single module. This doesn't actually have any
 * knoledge of a {@link VSLModule} or native modules, rather this represents a
 * group of 'streams' and handled their accesss scopes through the
 * {@link PropogateModifierTraverser}. This specifically uses:
 *
 *     {
 *         protected: p.Propogate,
 *         private: p.Hide,
 *         public: p.Propogate,
 *         none: p.Propogate
 *     }
 *
 * If you want to inject modules you can set a shared scope instance by using
 * the CompilationGroup.lazyHook() which will specify a scope hook to other
 * {@link CompilationGroup}s.
 *
 * @example
 * let compilationGroup = new CompilationGroup()
 *
 * for (let file in files) {
 * 	let fileStream = compilationGroup.createStream()
 * 	fileStream.send(fs.readFileSync(file));
 * }
 *
 * let result = await compilationGroup.compile();
 *
 * @example
 * let compilationGroup = new CompilationGroup();
 *
 * let stream = compilationGroup.createStream();
 * stream.send(prompt('vsl> '));
 * stream.handleRequest(done => done(prompt('>>>> ')));
 *
 * compilationGroup.compile();
 */
export default class CompilationGroup {
    /**
     * Creates compilation group from VSLModule. This will take the streams from
     * there and open up a compilation instance for them. Use `.createStream()`
     * to add a stream, then call compile.
     */
    constructor() {
        /** @private */
        this.sources = [];
        
        // Map<name, CompilationHook>
        /** @private */
        this.hooks = new Map();
        
        // Manages global scope
        /** @private */
        this.globalScope = null;
        
        /**
         * An auto-generated list of metadata for this group. It may not be
         * fully filled so make sure you specify fields that you know the values
         * of before passing it to other functions & classes.
         * @type {GroupMetadata}
         */
        this.metadata = new GroupMetadata();
    }
    
    /**
     * Returns a compilationStream which you can setup to send data.
     * @return {CompilationStream} A stream which you can send data to/from
     */
    createStream() {
        let stream = new CompilationStream();
        this.sources.push(stream);
        return stream;
    }
    
    /**
     * Parses a CompilationStream and returns the AST
     * @private
     */
    async parse(stream) {
        let dataBlock, ast;
        let parser = new VSLParser();
        
        while (null !== (dataBlock = await stream.receive())) {
            ast = parser.feed(dataBlock);
        }
        
        if (ast.length === 0) {
            // TODO: expand error handling here
            throw new ParserError(
                `Unexpected token EOF`
            );
        }
        
        return ast[0];
    }
    
    /**
     * Lazily 'hooks' a CompilationHook to the current one. Call this *before*
     * {@link CompilationGroup~compile}.
     *
     * @param  {CompilationHook} hooks A compiltion bound to this one.
     */
    lazyHook(compilationGroup) {
        this.hooks.set(compilationGroup.name, compilationGroup);
    }
    
    /**
     * Compiles the sources. It's reccomended to use a `CompilationIndex` to
     * manage this because configuration and modules happen there.
     *
     * @param  {CompilationStream} stream A compilation stream which will be
     * @return {CompilationResult}        An object describing all the
     *                                    compilation infos. See
     *                                    {@link CompilationResult} for more
     *                                    information.
     */
    async compile(stream) {
        // === 1: Parse ===
        // Parse all ASTs in parallel
        let asts = await Promise.all( this.sources.map(::this.parse) );
        
        // === 2: Environment Setup ===
        // This will be our new AST of the entire module with a global shared
        // scope
        let block = new CodeBlock(asts, null);
        this.globalScope = block;
        
        // Shared context between *entire* group, in fact we'd want to share
        // this amount the CompilationIndex if it has one..
        let context = new TransformationContext();
        
        // === 3: Preprocessing ===
        // Queue each ast for pre-processing, this is important because we need
        // the registrant info for the PropogateModifier
        asts.forEach(ast => new VSLPreprocessor(context).queue([ ast ]));
        
        // === 4: Scope Sharing ===
        // Hook all the news ASTs together
        // This will addd the public, protected, and no-access-modifier
        // declarations to our new scope (`block`).
        new PropogateModifierTraverser(
            {
                protected: p.Propogate,
                private: p.Hide,
                public: p.Propogate,
                none: p.Propogate
            },
            block.scope
        ).queue(asts); // `asts` is already an ast of sorts.
        
        // Handle modules, this adds lazyHooks to the scope
        // Each file manages its own imports so we'll check here
        asts.forEach(file => {
            // Go through each import statement that each file specifies
            file.lazyHooks.forEach(hookNode => {
                let hook = this.hooks.get(hookNode.name);
                    
                if (!hook) throw new TransformError(
                    `Could not find module named ${hookNode.name}`,
                    hookNode,
                    e.UNDEFINED_MODULE
                );
                
                hook.scope.forEach(scopeItem => {
                    let res =  file.scope.set(scopeItem);
                    if (res === false) throw new TransformError(
                        `Importing module \`${hookNode.name}\` results in ` +
                        `duplicate declaration of \`${scopeItem.toString()}\``,
                        hookNode,
                        e.DUPLICATE_BY_IMPORT
                    );
                });
            });
        });
        
        console.log(block.scope);
        asts.forEach(file => console.log(file.scope));
        // Now `block` is our AST with all the important things.
        // The VSLTransformer will do remaining checks so we'll use it to do the
        // type checking etc.
        new VSLTransformer(context).queue(block);
    }
}
