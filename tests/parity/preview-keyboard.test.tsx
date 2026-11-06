import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { h, reactive } from 'vue'
import { PreviewKeyboard } from '../../components/docs/PreviewKeyboard'
import { PreviewEmbed } from '../../components/docs/PreviewEmbed'
import { createPreviewKeyboardController, isPreviewKeyboardCommand } from '../../components/docs/previewKeyboardInput'
import { OTPInput as ReactOTPInput } from '../../packages/ui/src/components/OTPInput'
import { OTPInput as VueOTPInput } from '../../packages/vue/src/components/OTPInput'
import { flushVue, mountVue } from './harness'

beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))) })

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function ReactCode() {
  const [value, setValue] = useState('')
  return <div data-preview-embed data-preview-presentation="screen" data-preview-keyboard="numeric">
    <ReactOTPInput value={value} onChange={setValue} /><output>{value}</output>
  </div>
}

async function codeExample(framework: string) {
  if (framework === 'React') render(<ReactCode />)
  else {
    const state = reactive({ value: '' })
    mountVue(() => h('div', { 'data-preview-embed': '', 'data-preview-presentation': 'screen', 'data-preview-keyboard': 'numeric' }, [
      h(VueOTPInput, { 'value': state.value, 'onUpdate:value': (value: string) => { state.value = value } }), h('output', state.value),
    ]))
    await flushVue()
  }
}

describe.each(['React', 'Vue'])('%s Phone numeric keyboard', (framework) => {
  test('passive mounting prepares a keyboard without stealing focus; keys use real OTP behavior', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    await codeExample(framework)
    const report = vi.fn()
    const controller = createPreviewKeyboardController(document, report)
    const keypad = render(<PreviewKeyboard onKey={(key) => controller.command(key)} />)
    try {
      expect(report).toHaveBeenLastCalledWith({ available: true, open: true, kind: 'numeric' })
      expect(document.activeElement).toBe(outside)
      act(() => controller.command('activate'))
      const cells = document.querySelectorAll<HTMLInputElement>('input')
      expect(document.activeElement).toBe(cells[0])
      // Touch scroll/cancellation does not type: insertion happens on activation, not down.
      fireEvent.pointerDown(keypad.getByRole('button', { name: '1', exact: true }), { pointerType: 'touch' })
      fireEvent.pointerCancel(keypad.getByRole('button', { name: '1', exact: true }), { pointerType: 'touch' })
      expect(document.querySelector('output')?.textContent).toBe('')
      for (const digit of ['1', '2', '3']) {
        await act(async () => { fireEvent.click(keypad.getByRole('button', { name: digit, exact: true })); await flushVue() })
      }
      expect(document.querySelector('output')?.textContent).toBe('123')
      expect(document.activeElement).toBe(cells[3])
      await act(async () => { fireEvent.click(keypad.getByRole('button', { name: 'Backspace' })); await flushVue() })
      expect(document.querySelector('output')?.textContent).toBe('12')
      expect(document.activeElement).toBe(cells[2])
      await act(async () => {
        fireEvent.paste(cells[2], { clipboardData: { getData: () => '9876' } })
        await flushVue()
      })
      expect(document.querySelector('output')?.textContent).toBe('129876')
      act(() => controller.command('hide'))
      expect(report).toHaveBeenLastCalledWith({ available: true, open: false, kind: 'numeric' })
      act(() => controller.command('show'))
      expect(report).toHaveBeenLastCalledWith({ available: true, open: true, kind: 'numeric' })
      expect(document.activeElement).toBe(cells[5])
    } finally { controller.destroy(); outside.remove() }
  })
})

describe('Phone keyboard scope and commands', () => {
  test.each(['coarse', 'touch'])('wide %s hardware keeps its native keyboard instead of simulating one', (mode) => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: mode !== 'coarse' })))
    const touchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: mode === 'touch' ? 1 : 0 })
    const view = render(<div data-preview-presentation="screen" data-preview-keyboard="numeric"><input inputMode="numeric" /></div>)
    const report = vi.fn()
    const controller = createPreviewKeyboardController(document, report)
    try {
      controller.command('activate')
      controller.command('1')
      expect(report).toHaveBeenLastCalledWith({ available: false, open: false, kind: null })
      const input = view.getByRole('textbox') as HTMLInputElement
      expect(document.activeElement).not.toBe(input)
      expect(input.value).toBe('')
      fireEvent.focus(input)
      expect(report).toHaveBeenLastCalledWith({ available: false, open: false, kind: null })
    } finally {
      controller.destroy()
      if (touchPoints) Object.defineProperty(navigator, 'maxTouchPoints', touchPoints)
      else Reflect.deleteProperty(navigator, 'maxTouchPoints')
    }
  })

  test.each([true, false])('a late-mounted screen honors only pending explicit activation (%s)', async (activate) => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const view = render(<div />)
    const controller = createPreviewKeyboardController(document, () => {})
    try {
      if (activate) controller.command('activate')
      view.rerender(<div data-preview-presentation="screen" data-preview-keyboard="numeric"><input aria-label="Late code" inputMode="numeric" /></div>)
      await waitFor(() => expect(document.documentElement.hasAttribute('data-preview-keyboard-open')).toBe(true))
      expect(document.activeElement).toBe(activate ? view.getByLabelText('Late code') : outside)
    } finally { controller.destroy(); outside.remove() }
  })

  test('compact OTP controls never activate a simulator', () => {
    const view = render(<div data-preview-presentation="component" data-preview-keyboard="numeric"><input inputMode="numeric" /></div>)
    const report = vi.fn()
    const controller = createPreviewKeyboardController(document, report)
    try {
      controller.command('activate')
      controller.command('1')
      expect(report).toHaveBeenLastCalledWith({ available: false, open: false, kind: null })
      expect(view.getByRole('textbox')).not.toBe(document.activeElement)
      expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('')
    } finally { controller.destroy() }
  })

  test('text-field mode preserves the selection and supports deleting and controlled React values', () => {
    function TextField() {
      const [value, setValue] = useState('12345')
      return <div data-preview-presentation="screen" data-preview-keyboard="numeric"><input inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} /><output>{value}</output></div>
    }
    const view = render(<TextField />)
    const controller = createPreviewKeyboardController(document, () => {})
    try {
      const input = view.getByRole('textbox') as HTMLInputElement
      act(() => controller.command('activate'))
      input.setSelectionRange(1, 4)
      act(() => controller.command('9'))
      expect(view.container.querySelector('output')?.textContent).toBe('195')
      act(() => controller.command('Backspace'))
      expect(view.container.querySelector('output')?.textContent).toBe('15')
    } finally { controller.destroy() }
  })

  test('only the active preview refocuses a replacement field; disabled and readonly fields are skipped', async () => {
    const fields = (alternate: boolean) => <div data-preview-presentation="screen" data-preview-keyboard="numeric">
      <input disabled inputMode="numeric" /><input readOnly inputMode="numeric" />
      {alternate ? <textarea key="other" aria-label="Other" /> : <input key="code" inputMode="numeric" aria-label="Code" />}
    </div>
    const view = render(fields(false))
    const report = vi.fn()
    const controller = createPreviewKeyboardController(document, report)
    try {
      act(() => controller.command('activate'))
      expect(document.activeElement).toBe(view.getByLabelText('Code'))
      view.rerender(fields(true))
      await waitFor(() => expect(report).toHaveBeenLastCalledWith({ available: false, open: false, kind: null }))
      view.rerender(fields(false))
      await waitFor(() => expect(document.activeElement).toBe(view.getByLabelText('Code')))
    } finally { controller.destroy() }
  })

  test('embed rejects keyboard messages with a foreign origin, source, key or unsupported command', () => {
    const parent = Object.getOwnPropertyDescriptor(window, 'parent')
    const postMessage = vi.fn()
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage } })
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    const view = render(<PreviewEmbed target="otp"><div data-preview-embed data-preview-presentation="screen" data-preview-keyboard="numeric"><input inputMode="numeric" /></div></PreviewEmbed>)
    const send = (command: unknown, origin = window.location.origin, source: MessageEventSource = window.parent, key = 'otp') => act(() => {
      window.dispatchEvent(new MessageEvent('message', { source, origin, data: { previewKey: key, previewKeyboardCommand: command } }))
    })
    try {
      const input = view.getByRole('textbox') as HTMLInputElement
      send('1', 'https://untrusted.example')
      send('2', window.location.origin, window)
      send('3', window.location.origin, window.parent, 'other')
      send('123')
      send({ key: '4' })
      expect(input.value).toBe('')
      expect(document.activeElement).not.toBe(input)
      send('activate')
      expect(document.activeElement).toBe(input)
      send('5')
      expect(input.value).toBe('5')
      expect(postMessage.mock.calls.every(([message]) => !('value' in message))).toBe(true)
      expect(isPreviewKeyboardCommand('5')).toBe(true)
      expect(isPreviewKeyboardCommand('5.0')).toBe(false)
    } finally { view.unmount(); if (parent) Object.defineProperty(window, 'parent', parent) }
  })
})
