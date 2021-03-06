import BackendWatcher from '../../BackendWatcher';
import t from '../../../parser/nodes';

import BackendWarning from '../../BackendWarning';
import BackendError from '../../BackendError';
import toLLVMType from '../helpers/toLLVMType';
import ValueRef from '../ValueRef';

import getFunctionName from '../helpers/getFunctionName';

import * as llvm from "llvm-node";

export default class LLVMInitializerStatement extends BackendWatcher {
    match(type) {
        return type instanceof t.InitializerStatement;
    }

    receive(node, tool, regen, context) {
        const backend = context.backend;
        const scopeItem = node.scopeRef;
        const args = scopeItem.args;
        const parentClass = scopeItem.initializingType; // Class being initalized
        const selfType = toLLVMType(parentClass, backend); // Class being initalized in LLVM

        // What the init should be called
        const llvmFuncName = getFunctionName(scopeItem);

        // Check if this has already been generated
        const callee = backend.module.getFunction(llvmFuncName);
        if (callee) return callee;

        // Get the function type by mapping each arg ref to a respective type.
        // Additionally the first argument is the class the initalizer
        // represents along with the return value.
        let functionType = llvm.FunctionType.get(
            selfType,
            [
                selfType,
                ...args.map(
                    arg => toLLVMType(arg.type, backend)
                )
            ],
            false
        );

        // Stores the LLVM function Constant* which will be the return value of
        // this fnuction
        // Create this function's prototype
        const func = llvm.Function.create(
            functionType,
            llvm.LinkageTypes.InternalLinkage,
            llvmFuncName,
            backend.module
        );

        const llvmFuncArgs = func.getArguments();

        // Add the refs to each arg.
        for (let i = 0; i < node.params.length; i++) {
            // Offset by one because first arg is class itself
            node.params[i].aliasRef.backendRef = new ValueRef(llvmFuncArgs[i + 1], { isPtr: false });
        }

        // It's a initializer, it cannot call itself.
        func.addFnAttr(llvm.Attribute.AttrKind.NoUnwind);

        // Now create the function body
        let entryBlock = llvm.BasicBlock.create(
            backend.context,
            "entry",
            func
        );

        let builder = new llvm.IRBuilder(entryBlock);
        let newContext = context.clone();
        newContext.builder = builder;
        newContext.parentFunc = func;

        regen('statements', node, newContext);

        // Add return of first arg
        const selfRef = llvmFuncArgs[0];
        builder.createRet(selfRef);

        return func;
    }
}
