export function getCaretCoordinates() {
  let x = 0,
    y = 0
  const isSupported = typeof window.getSelection !== 'undefined'
  if (isSupported) {
    const selection = window.getSelection()
    // Check if there is a selection (i.e. cursor in place)
    if (selection && selection.rangeCount !== 0) {
      const range = selection.getRangeAt(0).cloneRange()
      // Collapse the range to the start, so there are not multiple chars selected
      range.collapse(true)
      const rect = range.getClientRects()[0]
      if (rect) {
        x = rect.left // since the caret is only 1px wide, left == right
        y = rect.top // top edge of the caret
      }
    }
  }
  return { x, y }
}

export function getCaretIndex(element) {
  let position = 0
  const isSupported = typeof window.getSelection !== 'undefined'
  if (isSupported) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount !== 0) {
      const range = window.getSelection()?.getRangeAt(0)
      if (!range) return position
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(element)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      position = preCaretRange.toString().length
    }
  }
  return position
}

// https://jsfiddle.net/Xeoncross/4tUDk/
export function pasteHtmlAtCaret(html) {
  let sel, range
  if (window.getSelection) {
    // IE9 and non-IE
    sel = window.getSelection()
    if (sel.getRangeAt && sel.rangeCount) {
      range = sel.getRangeAt(0)
      range.deleteContents()

      // Range.createContextualFragment() would be useful here but is
      // non-standard and not supported in all browsers (IE9, for one)
      const el = document.createElement('div')
      el.innerHTML = html
      const frag = document.createDocumentFragment()

      let node, lastNode
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node)
      }
      range.insertNode(frag)

      // Preserve the selection
      if (lastNode) {
        range = range.cloneRange()
        range.setStartAfter(lastNode)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }
}
