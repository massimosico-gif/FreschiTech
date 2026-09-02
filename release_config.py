"""Configurazione di release di FreschiTech.

Questi valori erano in cima al release manager. Stanno qui una volta sola
perche' il resto della procedura - come si allinea la versione, come si trova
l'installer, come si crea la release, come si aggiorna il manifest - non e' piu'
in questo repository: vive in `tecno_release`, il pacchetto condiviso di
TauriKit.

    pip install "git+https://github.com/massimosico-gif/TauriKit#subdirectory=core/tecno-release"
"""

import re
from pathlib import Path
from typing import Optional

from tecno_release import Config, leggi_segreto

CARTELLA_BASE = Path(__file__).resolve().parent

CONFIG = Config(
    nome_app="FreschiTech",
    cartella_base=CARTELLA_BASE,
    proprietario_repo="massimosico-gif",
    # Gli asset non stanno nel repository del codice.
    repo_release="FreschiTech-Releases",
    # Il Gist che `tauri.conf.json` dichiara come endpoint dell'updater. Le
    # installazioni sui computer dei clienti interrogano questo, e nient'altro:
    # pubblicare un pacchetto senza aggiornarlo non consegna niente a nessuno.
    gist_id="8305a31d9ccfad4fe99a689baf958d4b",
)

# Dove cercare i segreti: prima il .env della radice, poi quello del frontend.
CARTELLE_ENV = [CARTELLA_BASE, CARTELLA_BASE / "modern-ui"]


def leggi_token() -> Optional[str]:
    """Il token GitHub, da dovunque si trovi su questa macchina.

    `leggi_segreto` guarda nei file `.env` e nell'ambiente, che e' la
    convenzione condivisa. Qui pero' il token e' anche in `GitHubToken.env`, un
    file con un nome tutto suo: continuare a leggerlo evita di dover spostare un
    segreto a mano, operazione che si fa una volta, si dimentica, e si ritrova
    il giorno della release.

    Nessuno dei due file e' versionato.
    """
    token = leggi_segreto("GITHUB_TOKEN", CARTELLE_ENV)
    if token:
        return token

    percorso = CARTELLA_BASE / "GitHubToken.env"
    if percorso.exists():
        trovato = re.search(r"GITHUB_TOKEN\s*=\s*(.*)", percorso.read_text(encoding="utf-8"))
        if trovato:
            # Gli apici e il ritorno a capo di Windows: un token che se li porta
            # dietro fallisce l'autenticazione con un errore che non li nomina.
            return trovato.group(1).strip().strip('"').strip("'").strip()

    return None
