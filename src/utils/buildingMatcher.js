/**
 * Utility function to find the best matching outdoor map node for a building name.
 * Prevents false-positive partial matches (e.g., "Auditorium" matching "SIIMS Auditorium",
 * or "Main Block" matching "Main Block 2").
 */

const cleanStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function findMatchingBuildingNode(targetName, nodes = []) {
  if (!targetName || !nodes || !Array.isArray(nodes) || nodes.length === 0) return null;
  const cleanTarget = cleanStr(targetName);
  if (!cleanTarget) return null;

  // 1. Exact clean string match (e.g. "auditorium" === "auditorium", "mainblock" === "mainblock")
  const exactMatch = nodes.find(n => {
    const nb = cleanStr(n.building_name || n.name || n.id);
    return nb === cleanTarget;
  });
  if (exactMatch) return exactMatch;

  // 2. Exact word tokens match (e.g. "Main Block" matches "Main Block", NOT "Main Block 2")
  const targetWords = String(targetName).toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const wordMatch = nodes.find(n => {
    const nodeStr = String(n.building_name || n.name || n.id || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const nodeWords = nodeStr.split(/\s+/).filter(Boolean);
    return targetWords.length === nodeWords.length && targetWords.every((w, i) => w === nodeWords[i]);
  });
  if (wordMatch) return wordMatch;

  // 3. Substring candidate match sorted by smallest string length difference
  const candidates = nodes.filter(n => {
    const nb = cleanStr(n.building_name || n.name || n.id);
    return nb && (nb.includes(cleanTarget) || cleanTarget.includes(nb));
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const na = cleanStr(a.building_name || a.name || a.id);
    const nb = cleanStr(b.building_name || b.name || b.id);
    return Math.abs(na.length - cleanTarget.length) - Math.abs(nb.length - cleanTarget.length);
  });

  return candidates[0];
}
