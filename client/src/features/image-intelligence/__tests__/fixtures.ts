/** Fixtures mirror the exact response shapes in src/routes/imageIntelligence.routes.ts. */
export const STATS = {
  total: 120, exactDuplicates: 4, nearDuplicates: 6, missingMetadata: 30, c2pa: 1, qualityWarnings: 2, aiFlagged: 0,
  aiDetectorActive: false, notAnalyzed: 9,
  byReview: { pending: 5, needs_review: 2, reviewed: 100 }, byAnalysis: { complete: 120 },
  note: 'Automated estimate based on technical evidence. Not proof of fraud or of origin; human review required.',
};

const base = {
  sourceId: 11, animalId: 11, listingId: null, farmId: 3, width: 800, height: 600, metadataStatus: 'absent',
  cameraMake: null, cameraModel: null, c2paPresent: false, aiStatus: 'not_run', analysisStatus: 'complete',
  analyzedAt: '2026-10-01T10:05:00Z', createdAt: '2026-10-01T10:00:00Z', farmName: 'Wanjiru Farm',
};

export const LIST = {
  items: [
    { ...base, id: 1, source: 'animal_photo', flags: ['exact_duplicate', 'no_metadata'], reviewStatus: 'needs_review', _count: { matches: 1, matchedBy: 0 }, fileUrl: '/api/admin/images/1/file' },
    { ...base, id: 2, source: 'market_photo', farmId: 4, farmName: 'Kamau Farm', flags: [], reviewStatus: 'reviewed', _count: { matches: 0, matchedBy: 1 }, fileUrl: '/api/admin/images/2/file' },
  ],
  page: 1, limit: 24, total: 48, pages: 2, note: 'x',
};

export const DETAIL = {
  image: {
    ...LIST.items[0], mimeType: 'image/jpeg', url: '/uploads/a.jpg',
    exifJson: { orientation: null, lens: null, notes: ['No EXIF block found'], c2paNote: null },
    matches: [], matchedBy: [], reviews: [], animal: { id: 11, name: 'Daisy', tagNumber: 'T-12' },
  },
  matches: [{
    id: 5, direction: 'this_matches_earlier', type: 'near', method: 'phash', score: 0.93, evidence: { hamming: 3 },
    other: { id: 2, source: 'market_photo', sourceId: 9, animalId: null, listingId: 9, farmId: 4, createdAt: '2026-09-01T08:00:00Z', fileUrl: '/api/admin/images/2/file' },
  }],
  reviews: [],
  limitations: [
    'Missing metadata does not prove an image was downloaded or generated.',
    'AI-generation assessment: not run (no calibrated detector configured).',
  ],
  note: 'x',
};
