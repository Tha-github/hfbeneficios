import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Settings } from '../../src/content/schema'
import { SiteApp } from '../../src/site/App'
import { publishedContent, settings } from '../fixtures'

const renderSite = (overrides: Partial<Settings> = {}) =>
  render(<SiteApp content={publishedContent} settings={{ ...settings, ...overrides }} />)

describe('site', () => {
  it('tem um único h1 e as seções fixas', () => {
    renderSite()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const name of ['Qual solução você procura?', publishedContent.about.title, publishedContent.differentials.title]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(document.getElementById('depoimentos')).toBeNull()
  })

  it('apresenta exatamente quatro especialidades no seletor', () => {
    renderSite()
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      expect.stringContaining('Planos de Saúde'),
      expect.stringContaining('Planos Odontológicos'),
      expect.stringContaining('Seguro Saúde'),
      expect.stringContaining('Seguros Agrícolas'),
    ])
  })

  it('navega pelas especialidades com o teclado', async () => {
    const user = userEvent.setup()
    renderSite()
    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[0])
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Planos Odontológicos/)
    await user.keyboard('{End}')
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('CTA da especialidade pré-seleciona o formulário', async () => {
    const user = userEvent.setup()
    renderSite()
    await user.click(screen.getAllByRole('tab')[3])
    await user.click(screen.getByRole('link', { name: /Cotar seguro agrícola/ }))
    expect(screen.getByLabelText('Especialidade de interesse')).toHaveValue('seguros-agricolas')
  })

  it('mostra erros acessíveis e não abre o WhatsApp com dados inválidos', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    renderSite({ whatsappNumber: '5565999990000' })
    await user.click(screen.getByRole('button', { name: /Continuar no WhatsApp/ }))
    const name = screen.getByLabelText('Nome')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveFocus()
    expect(name).toHaveAccessibleDescription('Informe seu nome.')
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('abre o WhatsApp com a mensagem quando o número está configurado', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    renderSite({ whatsappNumber: '5565999990000' })
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza')
    await user.type(screen.getByLabelText('WhatsApp'), '65999991234')
    await user.click(screen.getByLabelText('Empresa'))
    await user.selectOptions(screen.getByLabelText('Especialidade de interesse'), 'planos-odontologicos')
    await user.click(screen.getByRole('button', { name: /Continuar no WhatsApp/ }))
    expect(open).toHaveBeenCalledOnce()
    const [url, target, features] = open.mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/wa\.me\/5565999990000\?text=/)
    expect(decodeURIComponent(String(url))).toContain('Especialidade: Planos Odontológicos')
    expect(target).toBe('_blank')
    expect(features).toContain('noopener')
    expect(screen.getByRole('status')).toHaveTextContent(publishedContent.contact.form.successMessage)
    open.mockRestore()
  })

  it('não promete envio quando o WhatsApp não está configurado', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    renderSite({ whatsappNumber: '' })
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza')
    await user.type(screen.getByLabelText('WhatsApp'), '65999991234')
    await user.click(screen.getByLabelText('Pessoa física'))
    await user.selectOptions(screen.getByLabelText('Especialidade de interesse'), 'seguro-saude')
    await user.click(screen.getByRole('button', { name: /Continuar no WhatsApp/ }))
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(publishedContent.contact.form.unavailableMessage)
    open.mockRestore()
  })

  it('só exibe redes sociais com URL confirmada', () => {
    renderSite()
    expect(screen.queryByRole('link', { name: /@hfbeneficios/ })).toBeNull()
    render(
      <SiteApp
        content={publishedContent}
        settings={{
          ...settings,
          social: [
            { handle: '@hfbeneficios.mt', label: 'Instagram', url: 'https://www.instagram.com/hfbeneficios.mt' },
            settings.social[1],
          ],
        }}
      />,
    )
    const links = screen.getAllByRole('link', { name: /@hfbeneficios\.mt/ })
    for (const link of links) expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('exibe depoimentos apenas quando habilitados e autorizados', () => {
    renderSite({
      testimonials: { enabled: true, items: [{ name: 'Cliente', context: 'Empresa', quote: 'Ótimo atendimento.', authorized: true }] },
    })
    expect(screen.getByRole('heading', { name: 'Quem já conta com a HF' })).toBeInTheDocument()
  })

  it('menu móvel abre, fecha com Escape e devolve o foco', async () => {
    const user = userEvent.setup()
    renderSite()
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })
})
