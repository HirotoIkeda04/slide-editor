import type { SlideFormat } from '../types'

// 各フォーマットの固定サイズ（px単位）
// PowerPointの標準サイズを基準に設定
export const formatSizes: Record<SlideFormat, { width: number; height: number }> = {
  webinar: { width: 1920, height: 1080 }, // 16:9 (Full HD)
  meeting: { width: 1920, height: 1080 }, // 16:9
  seminar: { width: 1920, height: 1080 }, // 16:9
  conference: { width: 1920, height: 1080 }, // 16:9
  instapost: { width: 1080, height: 1350 }, // 4:5 (Instagram Post)
  instastory: { width: 1080, height: 1920 }, // 9:16 (Instagram Story)
  a4: { width: 1123, height: 1587 }, // A4 (210mm x 297mm at 96dpi)
}

// フォントサイズ設定
// 本文フォントサイズを基準として、ジャンプ率で見出しやキーメッセージのサイズを計算
export const fontConfigs: Record<SlideFormat, {
  baseFontSize: number // 本文フォントサイズ（px）
  headingJumpRate: number // 見出しのジャンプ率
  keyMessageJumpRate: number // キーメッセージのジャンプ率
  codeJumpRate: number // コードブロックのジャンプ率
  fontFamily: string // フォントファミリー
}> = {
  webinar: { baseFontSize: 34, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", "Yu Gothic", sans-serif' },
  meeting: { baseFontSize: 34, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", "Yu Gothic", sans-serif' },
  seminar: { baseFontSize: 43, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", "Yu Gothic", sans-serif' },
  conference: { baseFontSize: 67, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", "Yu Gothic Medium", sans-serif' },
  instapost: { baseFontSize: 34, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif' },
  instastory: { baseFontSize: 36, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif' },
  a4: { baseFontSize: 22, headingJumpRate: 1.5, keyMessageJumpRate: 2.0, codeJumpRate: 0.8, fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif' },
}

export const formatConfigs: Record<SlideFormat, { icon: string; name: string; description: string; ratio: string; slideSplitLevel: number; width: number; height: number }> = {
  webinar: { icon: 'videocam', name: 'SlideS (16:9)', description: '小規模会議・オンライン向けのフォーマット（Webinar統合）', ratio: '16:9', slideSplitLevel: 2, width: formatSizes.webinar.width, height: formatSizes.webinar.height },
  meeting: { icon: 'groups', name: 'SlideS (16:9)', description: '小規模な会議やチームミーティング向けのフォーマット', ratio: '16:9', slideSplitLevel: 2, width: formatSizes.meeting.width, height: formatSizes.meeting.height },
  seminar: { icon: 'school', name: 'SlideM (16:9)', description: '中規模なセミナーや研修、勉強会向けのフォーマット', ratio: '16:9', slideSplitLevel: 2, width: formatSizes.seminar.width, height: formatSizes.seminar.height },
  conference: { icon: 'business', name: 'SlideL (16:9)', description: '大規模な会議やカンファレンス、講演会向けのフォーマット', ratio: '16:9', slideSplitLevel: 3, width: formatSizes.conference.width, height: formatSizes.conference.height },
  instapost: { icon: 'collections', name: 'Post (4:5)', description: 'Instagram投稿用の縦長フォーマット', ratio: '4:5', slideSplitLevel: 3, width: formatSizes.instapost.width, height: formatSizes.instapost.height },
  instastory: { icon: 'phone_android', name: 'Story (9:16)', description: 'Instagramストーリーやショート動画向けのフォーマット', ratio: '9:16', slideSplitLevel: 3, width: formatSizes.instastory.width, height: formatSizes.instastory.height },
  a4: { icon: 'description', name: 'A4 (21:30)', description: '印刷・配布資料向けのA4サイズフォーマット', ratio: 'A4', slideSplitLevel: 1, width: formatSizes.a4.width, height: formatSizes.a4.height },
}

