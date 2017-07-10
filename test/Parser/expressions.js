import { valid, invalid } from '../hooks';

export default () => describe("Expressions", () => {
    valid`1 + 1`;
    valid`1 - 1`;
    valid`1 * 1`;
    valid`1 / 1`;
    valid`1 ^ 1`;
    valid`1 & 1`;
    valid`1 | 1`;
    valid`1 ** 1`;
    
    valid`0..2`;
    valid`0...1`;
    
    valid`+1`; // numeric noop
    valid`-1`; // negation
    valid`*1`; // Spread opreator
    
    invalid`1 +`;
    invalid`/ 1`;
    invalid`1 -`;
    
        
    describe("Properties", () => {
        valid`a`;
        valid`a1`;
        valid`_a`;
        
        // now valid  (1).a
        valid`1a`;
        
        valid`a b`;
        valid`a b c: d`;
        valid`a b c: d, 5, e: f`;
        valid`a.b`;
        valid`a(b)`;
        valid`a.b(c)`;
        valid`a.b(c).d`;
        valid`a.b[c]`;
        valid`a.b[c].d`;
        
        // Unicode :D
        valid`ಠ_ಠ.ಠ_ಠ`;
        
        valid`a?.b`;
        invalid`a?`;
        invalid`a?.b?`;
        
        valid`a?[c]`;
        valid`a[c]?.d`;
        valid`a[c]?[d]`;
        
        invalid `a[c]?d`
    });
    
    describe("Closure Command Chains", () => {
        valid`if foo {bar}`;
        valid`if foo {bar; 1+1}`;
        valid`if (foo) {bar; 1+1}`;
        valid`if (foo) {bar; 1+1}`;
    });
})