fn main() {
    // Legge la chiave di migrazione dei database cifrati e le credenziali
    // della diagnostica dai file locali NON versionati, e le scrive in
    // `$OUT_DIR/segreti_incorporati.rs`, che `src/segreti.rs` include.
    //
    // Senza i file la build riesce comunque, con un warning: le funzionalita'
    // che ne dipendono restituiranno un errore esplicativo invece di
    // funzionare con credenziali pubbliche.
    tecno_core_build::incorpora_segreti("freschitech");

    tauri_build::build()
}
