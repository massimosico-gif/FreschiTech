// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import FeedbackProvider from './FeedbackProvider'
import { useConfirm, useToast } from '../../hooks/useFeedback'

// Senza `globals: true` vitest non attiva l'auto-cleanup di Testing
// Library: il DOM del test precedente resterebbe montato e le query
// troverebbero piu' di un risultato.
afterEach(cleanup)

/** Consumatore di prova: espone i due hook tramite pulsanti. */
const Consumatore = ({ onEsito, opzioni = {} }) => {
  const confirm = useConfirm()
  const toast = useToast()

  return (
    <>
      <button onClick={async () => onEsito(await confirm(opzioni))}>chiedi</button>
      <button onClick={() => toast.success('salvato')}>notifica</button>
      <button onClick={() => toast.error('rotto')}>errore</button>
    </>
  )
}

const monta = (props = {}) => {
  const onEsito = vi.fn()
  render(
    <FeedbackProvider>
      <Consumatore onEsito={onEsito} {...props} />
    </FeedbackProvider>
  )
  return { onEsito, utente: userEvent.setup() }
}

describe('conferme', () => {
  it('la Promise si risolve true quando si conferma', async () => {
    const { onEsito, utente } = monta()

    await utente.click(screen.getByText('chiedi'))
    await utente.click(await screen.findByRole('button', { name: /elimina/i }))

    await waitFor(() => expect(onEsito).toHaveBeenCalledWith(true))
  })

  it('la Promise si risolve false quando si annulla', async () => {
    const { onEsito, utente } = monta()

    await utente.click(screen.getByText('chiedi'))
    await utente.click(await screen.findByRole('button', { name: /annulla/i }))

    await waitFor(() => expect(onEsito).toHaveBeenCalledWith(false))
  })

  it('il chiamante riceve un solo esito, anche se ConfirmModal chiude subito dopo', async () => {
    // `ConfirmModal` invoca `onConfirm` e SUBITO DOPO `onClose`, quindi
    // `settle` viene chiamata due volte: la Promise deve restare risolta a
    // `true` e il chiamante non deve vedere un secondo esito.
    const { onEsito, utente } = monta()

    await utente.click(screen.getByText('chiedi'))
    await utente.click(await screen.findByRole('button', { name: /elimina/i }))

    await waitFor(() => expect(onEsito).toHaveBeenCalledTimes(1))
    expect(onEsito).toHaveBeenCalledWith(true)
  })

  it('mostra i testi passati dal chiamante', async () => {
    const { utente } = monta({
      opzioni: {
        title: 'Eliminare il contatto?',
        message: 'Operazione non annullabile.',
        confirmLabel: 'Procedi'
      }
    })

    await utente.click(screen.getByText('chiedi'))

    expect(await screen.findByText('Eliminare il contatto?')).toBeDefined()
    expect(screen.getByText('Operazione non annullabile.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Procedi' })).toBeDefined()
  })

  it('la finestra sparisce dopo la scelta', async () => {
    const { utente } = monta()

    await utente.click(screen.getByText('chiedi'))
    await utente.click(await screen.findByRole('button', { name: /annulla/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('Esc annulla', async () => {
    const { onEsito, utente } = monta()

    await utente.click(screen.getByText('chiedi'))
    await screen.findByRole('dialog')
    await utente.keyboard('{Escape}')

    await waitFor(() => expect(onEsito).toHaveBeenCalledWith(false))
  })
})

describe('notifiche', () => {
  it('mostra il messaggio di successo', async () => {
    const { utente } = monta()
    await utente.click(screen.getByText('notifica'))
    expect(await screen.findByText('salvato')).toBeDefined()
  })

  it('mostra il messaggio di errore', async () => {
    const { utente } = monta()
    await utente.click(screen.getByText('errore'))
    expect(await screen.findByText('rotto')).toBeDefined()
  })

  it('nessuna notifica e nessuna finestra al primo render', () => {
    monta()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
