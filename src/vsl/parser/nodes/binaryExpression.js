import Node from './node';

/**
 * Matches a binary expression
 * 
 * See Also: `UnaryExpression`
 * 
 * This matches any generic binary expression.
 */
export default class BinaryExpression extends Node {
    
    /**
     * Creates a wrapper ExpressionStatement
     * 
     * @param {Expression} lhs left-hand side of the expression
     * @param {Expression} rhs right-hand side of the expression
     * @param {string} operator the operator for the expression
     * @param {Object} position a position from nearley
     */
    constructor (lhs: Expression, rhs: Expression, operator: string, isClosure: boolean, position: Object) {
        super(position);
        
        /** @type {Expression} */
        this.lhs = lhs;
        /** @type {Expression} */
        this.rhs = rhs;
        /** @type {string} */
        this.op = operator;
        /** @type {boolean} */
        this.isClosure = isClosure;
    }
    
    /** @override */
    get children() {
        return ['lhs', 'rhs'];
    }
    
    /** @override */
    toString() {
        return `(${this.lhs} ${this.op} ${this.rhs})`
    }
}