export type IReview = {
    id: number;
    rating: number;
    comment: string;
    isHidden: boolean;
    adminNote?: string;
    ipAddress: string;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
    productId: number;
    orderId: number;
}

export type IReviewFilters = {
    searchTerm?: string;
    rating?: string;
    isHidden?: string;
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
    isHidden?: boolean; // Only for admin
    adminNote?: string; // Only for admin
}
