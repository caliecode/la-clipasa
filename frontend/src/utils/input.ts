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

export function setCaretPosition(element: Node, offset: number) {
  const range = document.createRange()
  const sel = window.getSelection()

  let charCount = 0
  let found = false

  function traverseNodes(node: Node) {
    if (found) return // Stop traversing once the position is set

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length ?? 0
      if (offset >= charCount && offset <= charCount + textLength) {
        range.setStart(node, offset - charCount)
        range.collapse(true) // Collapse the range to a single point (the caret)
        found = true
      } else {
        charCount += textLength
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'IMG') {
      // Treat images (emotes) as a single character for positioning purposes
      const emoteLength = (node as HTMLElement).getAttribute('title')?.length ?? 1 // Use title length or 1 as length
      if (offset >= charCount && offset < charCount + emoteLength) {
        // Position caret *after* the image
        range.setStartAfter(node)
        range.collapse(true)
        found = true
      } else {
        charCount += emoteLength
      }
    } else {
      // Recursively traverse child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        traverseNodes(node.childNodes[i]!)
        if (found) break // Exit loop if position is set
      }
    }
  }

  traverseNodes(element)

  if (sel && found) {
    sel.removeAllRanges()
    sel.addRange(range)
  } else if (sel && !found && element.childNodes.length > 0) {
    // If offset is beyond content length, place cursor at the very end
    const lastNode = element.childNodes[element.childNodes.length - 1]
    if (lastNode) {
      if (lastNode.nodeType === Node.TEXT_NODE) {
        range.setStart(lastNode, lastNode.textContent?.length ?? 0)
      } else {
        range.setStartAfter(lastNode)
      }
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }
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
