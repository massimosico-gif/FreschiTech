/**
 * Unione delle righe di piu' fatture elettroniche in un'unica riconciliazione.
 *
 * PERCHE' UNA FUNZIONE A PARTE
 * ----------------------------
 * Vive fuori dal componente per poter essere provata: tre delle cose che fa
 * sbagliano in silenzio, e nessuna produrrebbe un errore a schermo.
 *
 *   * gli `id` che arrivano dal backend ripartono da 0 per ogni fattura, e la
 *     tabella di riconciliazione identifica le righe proprio con l'id: uniti
 *     senza rinumerare, agire su una riga ne cambierebbe un'altra;
 *   * il fornitore e' per fattura, non per lotto. Attaccato alla riga sbagliata
 *     manda articoli a listino sotto il nome di un altro fornitore, che in un
 *     listino e' il dato con cui si ritrova un articolo;
 *   * una fattura illeggibile non deve far perdere le altre, altrimenti si
 *     rifa' la selezione dell'intero gruppo per colpa di un file.
 */

/** Nome del file senza il percorso, con separatori Windows o Unix. */
export const nomeFile = (percorso) => String(percorso).split(/[\\/]/).pop()

const FORNITORE_PREDEFINITO = 'Fornitore Generico'

/**
 * @param esiti elenco di `{ percorso, result }` per le fatture lette e
 *              `{ percorso, error }` per quelle che non si sono aperte,
 *              nell'ordine in cui vanno mostrate.
 * @returns `{ righe, sorgenti }` — le righe rinumerate e pronte per la
 *          tabella, e il riepilogo per file.
 */
export const unisciFatture = (esiti) => {
  const righe = []
  const sorgenti = []
  let prossimoId = 0

  for (const esito of esiti) {
    const file = nomeFile(esito.percorso)

    if (esito.error || !esito.result) {
      sorgenti.push({ file, supplier: null, count: 0, error: String(esito.error || 'File non leggibile') })
      continue
    }

    const supplier = esito.result.supplier || FORNITORE_PREDEFINITO
    const rows = esito.result.rows || []

    for (const r of rows) {
      righe.push({
        id: prossimoId++,
        invoiceRow: {
          description: r.invoice_item.description,
          unit: r.invoice_item.unit,
          unit_price: r.invoice_item.unit_price,
          supplier
        },
        suggestedItem: r.suggested_item,
        matchScore: r.match_score,
        action: r.action,
        selectedCatalogItemId: r.selected_catalog_item_id,
        customCode: r.custom_code,
        invoiceItem: r.invoice_item,
        markup: r.markup !== null && r.markup !== undefined ? r.markup : 0.0,
        // Il fornitore e il file di provenienza restano attaccati alla riga:
        // il primo serve all'importazione, il secondo a distinguere due
        // descrizioni identiche arrivate da fatture diverse.
        supplier,
        sourceFile: file
      })
    }

    sorgenti.push({ file, supplier, count: rows.length, error: null })
  }

  return { righe, sorgenti }
}
