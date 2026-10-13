/**
 * Nomi dei file proposti nelle finestre di salvataggio.
 *
 * PERCHE' NON BASTA SOSTITUIRE GLI SPAZI
 * --------------------------------------
 * Prima il nome si costruiva con `project.name.replace(/\s+/g, '_')`, e
 * bastava perche' nel nome entrava solo la commessa. Da quando ci entra anche
 * il centro di costo non basta piu': un modello come `A5 1/2"` contiene
 * caratteri che Windows non ammette in un nome file, e la finestra di
 * salvataggio li rifiuta o li taglia — con un nome proposto che l'utente
 * credeva valido.
 */

/** Caratteri vietati nei nomi file su Windows, piu' quelli di controllo. */
const VIETATI = /[\\/:*?"<>|]/g

/** Riduce un testo libero a un frammento usabile in un nome file. */
export const frammentoNome = (testo) =>
  String(testo ?? '')
    .replace(VIETATI, '')
    .trim()
    .replace(/\s+/g, '_')
    // I punti a fine nome vengono tolti da Windows: meglio non proporli.
    .replace(/\.+$/, '')

/**
 * Nome del PDF di una commessa, o di un suo singolo centro di costo.
 *
 * Il centro di costo entra nel nome quando il documento e' ristretto: due
 * esportazioni dalla stessa commessa produrrebbero altrimenti lo stesso nome,
 * e la seconda sovrascriverebbe la prima senza dire che erano documenti
 * diversi.
 */
export const nomeFilePdf = (project, costCenter, suffix) => {
  const commessa = frammentoNome(project?.name) || 'Commessa'

  if (!costCenter) return `Commessa_${commessa}_${suffix}.pdf`

  const etichetta = frammentoNome(
    [costCenter.brand, costCenter.model].filter(Boolean).join(' ')
  )
  // Un centro di costo senza marca ne' modello non aggiunge nulla al nome:
  // meglio il nome della commessa che un `CC_` vuoto.
  return etichetta
    ? `Commessa_${commessa}_CC_${etichetta}_${suffix}.pdf`
    : `Commessa_${commessa}_${suffix}.pdf`
}
