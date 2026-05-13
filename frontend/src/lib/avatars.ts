const DICEBEAR_CROODLES_URL = 'https://api.dicebear.com/9.x/croodles/svg';

export function getAuthorAvatarUrl(seed: string) {
  const params = new URLSearchParams({
    seed,
    size: '128',
    radius: '50',
    backgroundType: 'solid',
    backgroundColor: 'ffffff',
  });

  return `${DICEBEAR_CROODLES_URL}?${params.toString()}`;
}
