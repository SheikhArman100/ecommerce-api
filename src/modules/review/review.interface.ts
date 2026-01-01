export type IReview = {
    id: number;
    rating: number;
    comment: string;
    isHide: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
    productId: number;
    orderId: number;
}

export type IReviewFilters = {
    searchTerm?: string;
    rating?: string;
    isHide?: string;
    userId?: string;
    productId?: string;
    orderId?: string;
};

export type ICreateReviewPayload = {
    rating: number;
    comment: string;
    orderId: number;
    productId: number;
}

export type IUpdateReviewPayload = {
    rating?: number;
    comment?: string;
    isHide?: boolean; // Only for admin
}
