import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AdminApp } from '../../src/admin/AdminApp'
import { publishedContent } from '../../src/content'

describe('painel administrativo', () => {
  it('não oferece criar ou remover seções e itens', () => {
    render(<AdminApp />)
    expect(screen.queryByRole('button', { name: /adicionar|nova seção|novo item|excluir|remover/i })).toBeNull()
  })

  it('indica alterações, permite restaurar e salva rascunho local', async () => {
    const user = userEvent.setup()
    render(<AdminApp />)
    await user.click(screen.getByRole('button', { name: 'Hero' }))
    const title = screen.getByLabelText(/^Título/)
    await user.clear(title)
    await user.type(title, 'Proteção sob medida')
    expect(screen.getByText('1 alteração(ões) não publicada(s).', { exact: false })).toBeInTheDocument()
    expect(window.localStorage.getItem('hf-admin-rascunho-v1')).toContain('Proteção sob medida')

    await user.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect(title).toHaveValue(publishedContent.hero.title)
    expect(screen.getByText('Nenhuma alteração pendente.')).toBeInTheDocument()
  })

  it('exibe erro de validação no campo e bloqueia a exportação', async () => {
    const user = userEvent.setup()
    render(<AdminApp />)
    await user.click(screen.getByRole('button', { name: 'Rodapé' }))
    const field = screen.getByLabelText(/Direitos reservados/)
    await user.clear(field)
    await user.type(field, 'Texto <b>')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/não são permitidos/)

    await user.click(screen.getAllByRole('button', { name: /Publicar/ })[0])
    expect(screen.getByRole('button', { name: /Baixar site.json/ })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('footer.rights')
  })

  it('valida as cores contra contraste e famílias vetadas', async () => {
    const user = userEvent.setup()
    render(<AdminApp />)
    await user.click(screen.getByRole('button', { name: 'Cores' }))
    const hex = screen.getByLabelText('Cor principal: código hexadecimal')
    await user.clear(hex)
    await user.type(hex, '#C81E1E')
    expect(screen.getByText(/Família de cor vetada pela identidade: vermelho/)).toBeInTheDocument()
  })
})
