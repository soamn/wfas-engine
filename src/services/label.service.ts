export const getNodeLabel = (node: { type: string; id: string }) => {
  return `${node.type}_${node.id.slice(0, 4)}`;
};