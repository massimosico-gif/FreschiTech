// --- 1. CONFIGURAZIONE INIZIALE E VARIABILI ---
// Questi dati verranno iniettati da Rust come preambolo al template
// #let client = (...)
// #let invoice = (...)
// #let items = (...)
// #let totals = (...)

// Colori aziendali
#let accent-color = rgb(227, 6, 19) // Rosso Lely
#let logo-blue = rgb(0, 0, 0)       // Nero per testi

// Formattatore valuta
#let format-money(amount) = {
  if type(amount) == "string" {
    "€ " + amount
  } else {
    "€ " + str(calc.round(amount, digits: 2)).replace(".", ",")
  }
}

// --- 2. SETUP DELLA PAGINA E FOOTER ---
#set page(
  paper: "a4",
  margin: (left: 20mm, right: 21mm, top: 10mm, bottom: 35mm),
  
  // Watermark centrato (simuliamo 8% opacità con un overlay bianco al 92%)
  background: place(center + horizon, {
    image("logo2.png", width: 170mm)
    place(center + horizon, box(width: 175mm, height: 100mm, fill: white.transparentize(8%)))
  }),
  
  // Footer
  footer: locate(loc => {
    set text(size: 6.5pt)
    align(center)[
      Il presente documento non costituisce fattura valida ai fini del DpR 633 26/10/1972. La fattura definitiva verrà emessa all'atto del pagamento del corrispettivo \
      (articolo 6, comma 3, DpR 633/72)
    ]
    align(right)[Pagina #loc.page() di #counter(page).final(loc).first()]
    
    line(length: 100%, stroke: 0.5pt + accent-color)
    
    // Info aziendali
    align(center)[
      #set text(font: "Plus Jakarta Sans", fill: logo-blue, size: 9.2pt, tracking: 0.4.2pt)
      #text(weight: 700)[FreschiTech]
      #text(weight: 300)[ | Via Roma 1, 33100 Udine (UD) | P.Iva 01234567890 | info#("@")freschitech.it | www.freschitech.it | ]
      #text(weight: 700)[+39 0432 123456]
    ]
  })
)



// Impostazioni globali font
#set text(font: "Calibri", size: 10pt, lang: "it")

// --- 3. INTESTAZIONE E DESTINATARIO ---
#image("logo_tecnorilievi.png", width: 85mm)

#v(2mm)

#grid(
  columns: (1fr, 1fr),
  [], // Colonna vuota per spostarci a metà foglio
  [ // Destra: Blocco Destinatario
    #set text(size: 11pt)
    #grid(
      columns: (30mm, 5mm, 1fr),
      row-gutter: 7.15pt,
      grid.cell(colspan: 3)[Spett.le],
      grid.cell(colspan: 3)[*#client.name*],
      grid.cell(colspan: 3)[#client.street #client.house_number],
      grid.cell(colspan: 3)[#client.zip_code - #client.city (#client.province)],
      [Codice Fiscale], [:], [#align(right)[#client.tax_code]],
      [Partita IVA], [:], [#align(right)[#client.vat_id]],
      [Codice SDI], [:], [#align(right)[#if client.sdi_code != "" [#client.sdi_code] else [-]]],
      [Email], [:], [#align(right)[#if client.email != "" [#client.email] else [-]]],
      [PEC], [:], [#align(right)[#if client.pec != "" [#client.pec] else [-]]],
    )
  ]
)

#v(10mm)

// --- 4. TITOLO DOCUMENTO ---
*Fattura proforma FT-PRO n. #invoice.number del #invoice.date*
#v(1mm) // Spazio tra titolo e linea
#line(length: 100%, stroke: 1pt + accent-color)
#v(1mm) // Spazio tra linea e inizio contenuto

// --- 5. ARTICOLI (La Tabella) ---
Intervento con attrezzature professionali per l'indagine "non distruttiva" presso: \
#v(1mm)
*#invoice.billing_street #invoice.billing_house_number, #invoice.billing_zip_code - #invoice.billing_city (#invoice.billing_province)*
#v(5mm)

#table(
  columns: (10mm, 1fr, 35mm),
  stroke: none,
  align: (left, left, right),
  inset: (y: 6pt),
  gutter: 4pt,
  
  ..items.enumerate().map(((i, item)) => (
    if (i + 1) < 10 [0#(i + 1)] else [#(i + 1)],
    item.description,
    [€.#h(1fr)#format-money(item.total).replace("€ ", "") =]
  )).flatten()
)

// --- 6. RIEPILOGO TOTALI E PAGAMENTO ---
#v(1fr) // Spinge il riepilogo in fondo ma prima del footer

#line(length: 100%, stroke: 1pt + accent-color)
#v(2mm)

#grid(
  columns: (1fr, 1fr),
  [
    #set text(size: 9.2pt)
    #grid(
      columns: (25mm, 5mm, 1fr),
      row-gutter: 6pt,
      [Codice CIG], [:], [#if invoice.cig != "" [#invoice.cig] else [-]],
      [Codice CUP], [:], [#if invoice.cup != "" [#invoice.cup] else [-]],
    )
  ],
  [
    #set align(right)
    #set text(size: 10pt)
    Totale imponibile: #h(1fr) €.#h(2mm) #format-money(totals.netto).replace("€ ", "") = \
    #if totals.withholding != "0,00" [
      Ritenuta d'acconto: #h(1fr) - €.#h(2mm) #format-money(totals.withholding).replace("€ ", "") = \
    ]
    *#set text(size: 11pt); Totale Fattura: #h(1fr) €.#h(2mm) #format-money(totals.final).replace("€ ", "") =*
  ]
)

#v(8mm)
#if invoice.notes != "" [
  #set text(size: 9pt)
  *Eventuali note:* \
  #invoice.notes
  #v(8mm)
]

#set text(size: 10pt)
*Condizioni di pagamento:* \
#grid(
  columns: (30mm, 5mm, 1fr),
  row-gutter: 5pt,
  [Modalità], [:], [#invoice.payment_method],
  [Scadenza], [:], [#invoice.due_date],
  [Codice IBAN], [:], [#invoice.iban]
)
