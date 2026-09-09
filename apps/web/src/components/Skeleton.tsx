interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', className }: SkeletonProps) {
  const classes = ['skeleton'];
  if (className) classes.push(className);
  return (
    <div
      className={classes.join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}