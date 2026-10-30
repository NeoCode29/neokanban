export interface UiAnnotationAuthor {
  id: string
  name: string
  email?: string
  avatarUrl?: string | null
}

export interface UiAnnotationCard {
  id: string
  title: string
  columnId?: string
}

export interface UiAnnotationData {
  id: string
  pageId?: string | null
  componentId?: string | null
  authorId: string
  author?: UiAnnotationAuthor
  type: 'PIN' | 'BOX' | string
  posX: number // Percentage 0 - 100
  posY: number // Percentage 0 - 100
  width?: number | null // Percentage 0 - 100 (for BOX)
  height?: number | null // Percentage 0 - 100 (for BOX)
  comment: string
  status: 'OPEN' | 'RESOLVED' | string
  cardId?: string | null
  card?: UiAnnotationCard | null
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface UiPageData {
  id: string
  boardId: string
  title: string
  path: string
  description?: string | null
  status: 'DRAFT' | 'IN_PROGRESS' | 'READY' | string
  htmlContent: string
  order?: number
  annotations?: UiAnnotationData[]
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface UiComponentData {
  id: string
  boardId: string
  name: string
  category: string
  description?: string | null
  htmlContent: string
  order?: number
  annotations?: UiAnnotationData[]
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface CreateAnnotationPayload {
  type: 'PIN' | 'BOX'
  posX: number
  posY: number
  width?: number
  height?: number
  comment: string
}

export type ViewportDevice = 'desktop' | 'tablet' | 'mobile'
export type CanvasInteractionMode = 'browse' | 'review'
