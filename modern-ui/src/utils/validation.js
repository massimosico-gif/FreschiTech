/**
 * Valida la Partita IVA italiana
 */
export const validateVAT = (pi) => {
    if (!pi) return true;
    if (pi.length !== 11 || !/^[0-9]+$/.test(pi)) return false;
    
    let s = 0;
    for (let i = 0; i <= 9; i += 2) {
        s += parseInt(pi.charAt(i));
    }
    for (let i = 1; i <= 9; i += 2) {
        let c = 2 * parseInt(pi.charAt(i));
        if (c > 9) c -= 9;
        s += c;
    }
    
    let expected = (10 - (s % 10)) % 10;
    return parseInt(pi.charAt(10)) === expected;
};

/**
 * Valida il Codice Fiscale italiano
 */
export const validateTaxCode = (cf) => {
    if (!cf) return true;
    cf = cf.toUpperCase();
    if (cf.length !== 16 || !/^[A-Z0-9]+$/.test(cf)) return false;
    
    const setDispari = {
        '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
        'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
        'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
        'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
    };
    
    const setPari = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
        'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
        'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
    };
    
    let s = 0;
    for (let i = 1; i <= 15; i += 2) {
        s += setPari[cf.charAt(i - 1)];
    }
    for (let i = 2; i <= 14; i += 2) {
        s += setDispari[cf.charAt(i - 1)];
    }
    
    // Il 16esimo carattere è la somma dei primi 15 (pari e dispari) modulo 26
    // Ma aspetta, la logica standard è:
    // Caratteri in posizione dispari (1, 3, 5...) -> setDispari
    // Caratteri in posizione pari (2, 4, 6...) -> setPari
    // Attenzione: l'indice di stringa è 0-based. Quindi posizione 1 è indice 0 (dispari), posizione 2 è indice 1 (pari).
    
    let sum = 0;
    for (let i = 0; i < 15; i++) {
        let char = cf.charAt(i);
        if ((i + 1) % 2 !== 0) { // Posizione dispari (1, 3, 5...)
            sum += setDispari[char];
        } else { // Posizione pari (2, 4, 6...)
            sum += setPari[char];
        }
    }
    
    let expectedControlChar = String.fromCharCode((sum % 26) + 65);
    return cf.charAt(15) === expectedControlChar;
};
