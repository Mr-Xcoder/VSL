import Node from './node';

/**
 * Represents a function declaration's argument
 */

export default class FunctionArgument extends Node {

    /**
     * Makes new function argument
     * @param  {TypedIdentifier} typedId Type and name of argument
     * @param  {?Expression} defaultValue optional default argument value
     * @param  {Object} position position object from nearley.
     */
    constructor(typedId, defaultValue, position) {
        super(position);

        /** @type {TypedIdentifier} */
        this.typedId = typedId;

        /** @type {?Expression} */
        this.defaultValue = defaultValue;

        /**
         * Ref to decl in func body.
         * @type {?ScopeAliasItem}
         */
        this.aliasRef = null;
    }

    /** @override */
    get children() {
        return ['typedId', 'defaultValue'];
    }

    clone() {
        return new FunctionArgument(this.typedId.clone(), this.defaultValue?.clone());
    }

    /** @override */
    toString() {
        return `${this.typedId}${this.defaultValue ? " = " + this.defaultValue : ""}`
    }
}
