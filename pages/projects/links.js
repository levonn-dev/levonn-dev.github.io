// Splits a project description into text and link segments. A link is written
// as [label](project-id) and refers to another entry in projects.js.

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export function splitLinks(description) {
  const segments = [];
  let last = 0;
  for (const match of description.matchAll(LINK)) {
    if (match.index > last) segments.push({ text: description.slice(last, match.index) });
    segments.push({ text: match[1], id: match[2] });
    last = match.index + match[0].length;
  }
  if (last < description.length) segments.push({ text: description.slice(last) });
  return segments;
}
