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

TOGLIERLA DA QUI NON LA RENDE SEGRETA
-------------------------------------
Resta nella storia di git, su un repository pubblico, dal commit 8f566bf.
Chiunque l'abbia gia' clonato ce l'ha, e la rotazione e' l'unica correzione
vera.

Da sola pero' la chiave non basta a consegnare un aggiornamento falso: serve
anche poter cambiare cosa serve il Gist dichiarato in `tauri.conf.json`, e
quello richiede l'accesso all'account GitHub. Il difetto e' che oggi la
sicurezza dei client poggia su una serratura sola invece che su due.

COME SI RUOTA SENZA REINSTALLARE SUI COMPUTER DEI CLIENTI
---------------------------------------------------------
La chiave pubblica e' compilata dentro l'applicazione, quindi un client
installato verifica con quella che aveva quando e' stato installato. Basta
sfruttarlo: si pubblica UNA release "ponte" che contiene la chiave pubblica
nuova ma e' firmata con quella VECCHIA.

    client vN     ha pubkey VECCHIA
        scarica vN+1, firmata con la chiave VECCHIA  -> accetta
    client vN+1   ora ha pubkey NUOVA, era nel pacchetto
        scarica vN+2, firmata con la chiave NUOVA    -> accetta

L'ordine e' quindi:

  1. `cd modern-ui && npx tauri signer generate -w ~/chiave_nuova.txt`
     (senza -p: la password la chiede, e non finisce nella cronologia della
     shell. Metterne una VERA: quella storica era vuota, ed e' meta' del
     problema);
  2. la pubblica stampata va in `tauri.conf.json`, `plugins.updater.pubkey`;
  3. si pubblica la release ponte con `signing_key.txt` ANCORA VECCHIA;
  4. solo dopo si sostituisce `signing_key.txt` con quella nuova, e si mette la
     password in `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` dentro un `.env` non
     versionato - `_firma` la legge gia' da li';
  5. dalla release successiva si firma con la nuova.

Resta scoperto un solo caso: un client che SALTA la release ponte rimane con la
chiave vecchia e rifiutera' tutto cio' che viene dopo. Se i clienti sono pochi,
verificare che l'abbiano presa prima di firmare con la nuova.

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
