"""Caricamento della chiave privata usata per firmare gli aggiornamenti.

PERCHE' QUESTO FILE ESISTE
--------------------------
La chiave era una stringa letterale in cima a `release_manager_windows.py`, e
questo repository e' **pubblico**: chiunque poteva leggerla con una richiesta
anonima a raw.githubusercontent.com. Era per giunta protetta da una password
vuota - lo script stesso firmava con `--password ""` - quindi la cifratura non
proteggeva nulla.

E' la chiave che corrisponde alla `pubkey` dichiarata in `tauri.conf.json`. Chi
la possiede puo' firmare un pacchetto che TUTTE le copie gia' installate di
FreschiTech accettano come autentico e installano da sole.

ATTENZIONE: TOGLIERLA DA QUI NON LA RENDE SEGRETA
-------------------------------------------------
Resta nella storia di git, su un repository pubblico, dal commit 8f566bf.
Chiunque l'abbia gia' clonato ce l'ha. **La chiave va rigenerata**, e questa
e' l'unica correzione vera; spostarla e' solo il primo passo.

Rigenerarla ha un costo da mettere in conto: le installazioni esistenti hanno
la vecchia `pubkey` incorporata e RIFIUTERANNO gli aggiornamenti firmati con la
nuova. Serve una reinstallazione manuale sui computer dei clienti, una volta.

    npx tauri signer generate -w signing_key.txt

poi la chiave pubblica stampata va in `tauri.conf.json`, sotto
`plugins.updater.pubkey`.

DOVE VIENE CERCATA
------------------
  1. nella variabile d'ambiente TAURI_SIGNING_PRIVATE_KEY;
  2. nel file `signing_key.txt` accanto a questo modulo, escluso dal
     repository tramite .gitignore.

`signing_key.txt` non e' versionato: cambiando computer va ricopiato a mano,
altrimenti non e' piu' possibile pubblicare aggiornamenti che le installazioni
esistenti accettino. Conservane una copia in un gestore di password.
"""

import os
from pathlib import Path

NOME_FILE = "signing_key.txt"
VARIABILE = "TAURI_SIGNING_PRIVATE_KEY"


def percorso_chiave() -> Path:
    """Percorso atteso del file con la chiave, accanto a questo modulo."""
    return Path(__file__).resolve().parent / NOME_FILE


def load_signing_key() -> str:
    """Restituisce la chiave privata di firma.

    Solleva `RuntimeError` con un messaggio esplicito se non e' reperibile:
    meglio fermarsi prima di compilare che pubblicare un pacchetto con una
    firma che le installazioni esistenti rifiuteranno.
    """
    dall_ambiente = os.environ.get(VARIABILE, "").strip()
    if dall_ambiente:
        return dall_ambiente

    percorso = percorso_chiave()
    if percorso.is_file():
        chiave = percorso.read_text(encoding="utf-8").strip()
        if chiave:
            return chiave

    raise RuntimeError(
        f"Chiave di firma non trovata.\n"
        f"Attesa nella variabile d'ambiente {VARIABILE} oppure nel file:\n"
        f"  {percorso}\n\n"
        f"Il file non e' versionato di proposito: recuperalo dalla tua copia di "
        f"sicurezza e rimettilo in quella posizione."
    )
