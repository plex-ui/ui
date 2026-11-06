import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { h, reactive } from 'vue'
import { PreviewKeyboard } from '../../components/docs/PreviewKeyboard'
import { createPreviewKeyboardController, isPreviewKeyboardCommand, typePreviewKey } from '../../components/docs/previewKeyboardInput'
import { flushVue, mountVue } from './harness'

beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const interact = async (action: () => void) => act(async () => { action(); await flushVue() })

function ReactForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  const [submitted, setSubmitted] = useState('')
  return <div data-preview-presentation="screen" data-preview-keyboard="text">
    <form id="preview-album" onSubmit={(event) => { event.preventDefault(); setSubmitted(value) }}>
      <input aria-label="Album name" required value={value} onChange={(event) => setValue(event.currentTarget.value)} />
      <output data-testid="value">{value}</output><output data-testid="submitted">{submitted}</output>
    </form>
    <button type="submit" form="preview-album">Save album</button>
  </div>
}

async function textExample(framework: string, initial = '') {
  if (framework === 'React') render(<ReactForm initial={initial} />)
  else {
    const state = reactive({ value: initial, submitted: '' })
    mountVue(() => h('div', { 'data-preview-presentation': 'screen', 'data-preview-keyboard': 'text' }, [
      h('form', { id: 'preview-album', onSubmit: (event: Event) => { event.preventDefault(); state.submitted = state.value } }, [
        h('input', { 'aria-label': 'Album name', required: true, value: state.value, onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement) state.value = event.target.value
        } }),
        h('output', { 'data-testid': 'value' }, state.value), h('output', { 'data-testid': 'submitted' }, state.submitted),
      ]), h('button', { type: 'submit', form: 'preview-album' }, 'Save album'),
    ]))
    await flushVue()
  }
  return within(document.body).getByRole<HTMLInputElement>('textbox', { name: 'Album name' })
}

describe.each(['React', 'Vue'])('%s Phone text keyboard', (framework) => {
  test('passive preparation preserves focus; QWERTY, case, space and all visible layout switches edit the real model', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const input = await textExample(framework)
    const report = vi.fn()
    const controller = createPreviewKeyboardController(document, report)
    const keypad = render(<PreviewKeyboard kind="text" onKey={(key) => controller.command(key)} />)
    const press = (name: string) => interact(() => { fireEvent.click(keypad.getByRole('button', { name, exact: true })) })
    try {
      expect(document.activeElement).toBe(outside)
      expect(report).toHaveBeenLastCalledWith({ available: true, open: true, kind: 'text' })
      act(() => controller.command('activate'))
      expect(document.activeElement).toBe(input)
      expect(fireEvent.pointerDown(keypad.getByRole('button', { name: 'a', exact: true }), { pointerType: 'touch' })).toBe(false)
      fireEvent.pointerCancel(keypad.getByRole('button', { name: 'a', exact: true }))
      expect(input.value).toBe('')
      await press('Shift'); await press('C'); await press('Shift'); await press('a'); await press('t'); await press('Space')
      await press('Show numbers'); await press('1'); await press('2'); await press('Show symbols'); await press('#')
      await press('Show numbers'); await press('Show letters')
      expect(keypad.getByRole('button', { name: 'q', exact: true })).toBeTruthy()
      expect(input.value).toBe('Cat 12#')
      expect(within(document.body).getByTestId('value').textContent).toBe('Cat 12#')
      expect(document.activeElement).toBe(input)
      await press('Return')
      expect(within(document.body).getByTestId('submitted').textContent).toBe('Cat 12#')
      expect(input.value).not.toContain('Enter')
    } finally { controller.destroy(); outside.remove() }
  })

  test('insert and Backspace preserve selection/caret and controlled framework state', async () => {
    const input = await textExample(framework, 'alpha beta')
    const controller = createPreviewKeyboardController(document, () => {})
    try {
      act(() => controller.command('activate'))
      input.setSelectionRange(1, 5)
      await interact(() => controller.command('o'))
      expect(input.value).toBe('ao beta')
      expect(input.selectionStart).toBe(2)
      await interact(() => controller.command('Backspace'))
      expect(input.value).toBe('a beta')
      expect(input.selectionStart).toBe(1)
      input.setSelectionRange(0, 2)
      await interact(() => controller.command('Backspace'))
      expect(within(document.body).getByTestId('value').textContent).toBe('beta')
      expect(input.selectionStart).toBe(0)
      await interact(() => controller.command('Backspace'))
      expect(input.value).toBe('beta')
    } finally { controller.destroy() }
  })

  test('Return respects required validation and the pinned submitter click cancellation', async () => {
    const input = await textExample(framework)
    const controller = createPreviewKeyboardController(document, () => {})
    const button = within(document.body).getByRole('button', { name: 'Save album' })
    const cancel = (event: Event) => event.preventDefault()
    try {
      act(() => controller.command('activate'))
      await interact(() => controller.command('Enter'))
      expect(within(document.body).getByTestId('submitted').textContent).toBe('')
      await interact(() => controller.command('x'))
      button.addEventListener('click', cancel)
      await interact(() => controller.command('Enter'))
      expect(within(document.body).getByTestId('submitted').textContent).toBe('')
      button.removeEventListener('click', cancel)
      await interact(() => controller.command('Enter'))
      expect(within(document.body).getByTestId('submitted').textContent).toBe('x')
      expect(document.activeElement).toBe(input)
    } finally { button.removeEventListener('click', cancel); controller.destroy() }
  })
})

describe('text keyboard input protocol', () => {
  test.each(['keydown', 'beforeinput'])('%s cancellation preserves the value and emits no input', (eventName) => {
    const input = document.createElement('input')
    document.body.append(input)
    input.value = 'untouched'
    const events: string[] = []
    for (const name of ['keydown', 'beforeinput', 'input', 'keyup']) input.addEventListener(name, (event) => {
      events.push(name)
      if (name === eventName) event.preventDefault()
    })
    typePreviewKey(input, 'a')
    expect(input.value).toBe('untouched')
    expect(events).toEqual(eventName === 'keydown' ? ['keydown', 'keyup'] : ['keydown', 'beforeinput', 'keyup'])
    input.remove()
  })

  test('native event order, Unicode deletion, maxLength and email fields do not corrupt values', () => {
    const input = document.createElement('input')
    document.body.append(input)
    input.value = 'a🌍z'
    input.setSelectionRange(3, 3)
    const events: string[] = []
    for (const name of ['keydown', 'beforeinput', 'input', 'keyup']) input.addEventListener(name, () => events.push(name))
    typePreviewKey(input, 'Backspace')
    expect(input.value).toBe('az')
    expect(input.selectionStart).toBe(1)
    expect(events).toEqual(['keydown', 'beforeinput', 'input', 'keyup'])
    input.maxLength = 1
    input.value = 'a'
    input.setSelectionRange(1, 1)
    typePreviewKey(input, 'b')
    expect(input.value).toBe('a')
    input.type = 'email'
    input.removeAttribute('maxlength')
    input.value = 'a@b'
    expect(() => typePreviewKey(input, '.')).not.toThrow()
    expect(input.value).toBe('a@b.')
    input.remove()
  })

  test('only a marked eligible field provides the active kind; numeric input rejects text commands', async () => {
    const view = render(<div data-preview-presentation="screen">
      <div data-preview-keyboard="text"><input type="file" /><input disabled /><input readOnly /><input aria-label="Name" /></div>
      <div data-preview-keyboard="numeric"><input aria-label="Code" inputMode="numeric" /></div>
      <input aria-label="Unmarked" />
    </div>)
    const report = vi.fn()
    const controller = createPreviewKeyboardController(document, report)
    try {
      act(() => controller.command('activate'))
      expect(document.activeElement).toBe(view.getByLabelText('Name'))
      act(() => view.getByLabelText('Code').focus())
      expect(report).toHaveBeenLastCalledWith({ available: true, open: true, kind: 'numeric' })
      act(() => controller.command('a'))
      expect(view.getByRole<HTMLInputElement>('textbox', { name: 'Code' }).value).toBe('')
      act(() => controller.command('3'))
      expect(view.getByRole<HTMLInputElement>('textbox', { name: 'Code' }).value).toBe('3')
      act(() => view.getByLabelText('Name').focus())
      act(() => controller.command('hide'))
      expect(report).toHaveBeenLastCalledWith({ available: true, open: false, kind: 'text' })
      act(() => controller.command('show'))
      expect(report).toHaveBeenLastCalledWith({ available: true, open: true, kind: 'text' })
      view.getByLabelText('Name').setAttribute('readonly', '')
      view.getByLabelText('Code').setAttribute('disabled', '')
      await waitFor(() => expect(report).toHaveBeenLastCalledWith({ available: false, open: false, kind: null }))
    } finally { controller.destroy() }
  })

  test.each([false, true])('late text hydration focuses only with prior explicit activation=%s', async (activate) => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const controller = createPreviewKeyboardController(document, () => {})
    try {
      if (activate) controller.command('activate')
      const view = render(<div data-preview-presentation="screen" data-preview-keyboard="text"><input aria-label="Late field" /></div>)
      await waitFor(() => expect(document.activeElement).toBe(activate ? view.getByLabelText('Late field') : outside))
    } finally { controller.destroy(); outside.remove() }
  })

  test('iframe events and native value setter use the input owner realm', () => {
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const doc = frame.contentDocument
    const view = doc?.defaultView
    if (!doc || !view) throw new Error('Expected iframe realm')
    const input = doc.createElement('input')
    doc.body.append(input)
    const events: Event[] = []
    input.addEventListener('input', (event) => events.push(event))
    typePreviewKey(input, 'x')
    expect(input.value).toBe('x')
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(view.InputEvent)
    expect(events[0]).not.toBeInstanceOf(InputEvent)
    frame.remove()
  })

  test('command validator accepts only supported single characters and actions', () => {
    for (const key of ['A', 'z', ' ', '€', '“', 'Enter', 'Backspace']) expect(isPreviewKeyboardCommand(key)).toBe(true)
    for (const key of ['ab', '123', '\n', 'F1', '<script>', {}, null]) expect(isPreviewKeyboardCommand(key)).toBe(false)
  })
})
