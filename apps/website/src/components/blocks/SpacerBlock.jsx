export default function SpacerBlock({ data }) {
  const { height = 40 } = data || {};

  return <div style={{ height: `${height}px` }} />;
}
