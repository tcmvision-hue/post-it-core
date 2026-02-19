import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { profileId, language } = req.body

  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' })
  }

  return res.status(200).json({
    success: true,
    profileId,
    language: language || 'nl'
  })
}
