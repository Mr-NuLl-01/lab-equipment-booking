export function hasTimeOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date,
) {
  return newStart < existingEnd && newEnd > existingStart;
}
