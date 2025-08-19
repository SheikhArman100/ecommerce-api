# E-commerce API Project Overview

This document provides an overview of the modules in the e-commerce API project.

## Module Name: Auth
Auth handles user authentication and authorization.

### 1. User Signup
* route name : POST "/auth/signup"
* workflow
   * validate body
      * name (required, min 3 characters)
      * email (required, valid email format)
      * password (required, min 6 characters)
      * phoneNumber (required, min 10 characters)
      * role (optional, enum: ADMIN, USER)
   * check if email or phone number already exists
   * hash password
   * create new user
   * generate email verification token
   * send verification email with token

### 2. Email Verification
* route name : PUT "/auth/verify-email"
* workflow
   * validate query token
   * verify email token
   * update user verification status to true

### 3. User Signin
* route name : POST "/auth/signin"
* workflow
   * validate body
      * email (required, valid email format)
      * password (required, min 6 characters)
   * check if user exists
   * check if user is verified
   * verify password
   * generate access and refresh tokens
   * store refresh token in database
   * set refresh token in cookie

### 4. Google OAuth
* route name : GET "/auth/google"
* workflow
   * redirect to Google for authentication

### 5. Google OAuth Callback
* route name : GET "/auth/google/callback"
* workflow
   * handle Google OAuth response
   * create or update user
   * generate access and refresh tokens
   * store refresh token in database
   * set refresh token in cookie
   * send welcome email with credentials

### 6. Refresh Token
* route name : GET "/auth/token"
* workflow
   * get refresh token from cookie
   * verify refresh token
   * generate new access and refresh tokens
   * update refresh token in database
   * set new refresh token in cookie

### 7. User Signout
* route name : POST "/auth/signout"
* workflow
   * get refresh token from cookie
   * delete refresh token from database
   * clear refresh token cookie

### 8. Get Current User
* route name : GET "/auth/user"
* workflow
   * get refresh token from cookie
   * verify refresh token
   * return user information (id, email, role, isVerified)

## Module Name: User
User manages user profiles and details.

### 1. Create User
* route name : POST "/user/"
* workflow
   * (Not implemented)

### 2. Get All Users
* route name : GET "/user/"
* workflow
   * (Not implemented)

### 3. Get User by ID
* route name : GET "/user/:id"
* workflow
   * (Not implemented)

### 4. Update User
* route name : PATCH "/user/:id"
* workflow
   * (Not implemented)

### 5. Delete User
* route name : DELETE "/user/:id"
* workflow
   * (Not implemented)

## Module Name: Category
Category manages product categories.

### 1. Create Category
* route name : POST "/category/"
* workflow
   * admin access required
   * validate body
      * name (required, min 3 characters)
   * create new category with creator and updater info

### 2. Get All Categories
* route name : GET "/category/"
* workflow
   * fetch all categories with pagination and filtering
   * search by name
   * include creator and updater details

### 3. Get Category by ID
* route name : GET "/category/:id"
* workflow
   * fetch single category by ID
   * include creator and updater details

### 4. Update Category
* route name : PATCH "/category/:id"
* workflow
   * admin access required
   * validate body
      * name (required, min 3 characters)
   * update category information with updater info

### 5. Delete Category
* route name : DELETE "/category/:id"
* workflow
   * admin access required
   * remove category from database

## Module Name: Flavor
Flavor manages product flavors.

### 1. Create Flavor
* route name : POST "/flavor/"
* workflow
   * admin access required
   * validate body
      * name (required, min 3 characters)
      * color (required, min 3 characters)
   * create new flavor with creator and updater info

### 2. Get All Flavors
* route name : GET "/flavor/"
* workflow
   * fetch all flavors with pagination and filtering
   * search by name
   * include creator and updater details

### 3. Get Flavor by ID
* route name : GET "/flavor/:id"
* workflow
   * fetch single flavor by ID
   * include creator and updater details

### 4. Update Flavor
* route name : PATCH "/flavor/:id"
* workflow
   * admin access required
   * validate body
      * name (optional, min 3 characters)
      * color (optional, min 3 characters)
   * update flavor information with updater info

### 5. Delete Flavor
* route name : DELETE "/flavor/:id"
* workflow
   * admin access required
   * remove flavor from database

## Module Name: Size
Size requires a name field and has relationships with Product and Flavor through the ProductFlavorSize model. It tracks who created and updated each size.

### 1. Create Size
* route name : POST "/size/"
* workflow
   * admin access required
   * validate body
      * name (required, min 3 characters)
   * create new size with creator and updater info

### 2. Get All Sizes
* route name : GET "/size/"
* workflow
   * fetch all sizes with pagination and filtering
   * search by name
   * include creator and updater details

### 3. Get Size by ID
* route name : GET "/size/:id"
* workflow
   * fetch single size by ID
   * include creator and updater details

### 4. Update Size
* route name : PATCH "/size/:id"
* workflow
   * admin access required
   * validate body
      * name (required, min 3 characters)
   * update size information with updater info

### 5. Delete Size
* route name : DELETE "/size/:id"
* workflow
   * admin access required
   * remove size from database

## Module Name: Product
Product manages product information and inventory.

### 1. Create Product
* route name : POST "/product/"
* workflow
   * admin access required
   * validate form data
      * title (required, min 3 characters)
      * description (required, min 10 characters)
      * categoryId (required, numeric string)
      * flavors (required, array of objects)
         * flavorId (required, numeric string)
         * sizes (required, array of objects)
            * sizeId (required, numeric string)
            * stock (required, non-negative numeric string)
            * price (required, positive numeric string)
   * handle file uploads for product images
   * create new product with flavors, sizes, and images in a transaction

### 2. Get All Products
* route name : GET "/product/"
* workflow
   * fetch all products with pagination and advanced filtering
   * filter by searchTerm, title, createdBy, categoryId, categoryName, minPrice, maxPrice, flavorName, flavorColor, sizeName, minStock, maxStock, hasImages, inStock
   * include detailed information about creator, category, flavors, sizes, and images

### 3. Get Product by ID
* route name : GET "/product/:productId"
* workflow
   * fetch single product by ID
   * include detailed information about creator, updater, category, flavors, sizes, and images

### 4. Get Product by Slug
* route name : GET "/product/slug/:slug"
* workflow
   * fetch single product by slug
   * include detailed information about creator, updater, category, flavors, sizes, and images

## Module Name: Wishlist
Wishlist manages user product wishlists.

### 1. Add to Wishlist
* route name : POST "/wishlist/"
* workflow
   * user authentication required
   * validate body
      * productId (required, numeric string)
   * check if product exists
   * check if product is already in user's wishlist
   * add product to user's wishlist

### 2. Get All Wishlists
* route name : GET "/wishlist/"
* workflow
   * fetch all wishlists with pagination and filtering
   * filter by userId and productId
   * include user and product details

### 3. Get Wishlist by ID
* route name : GET "/wishlist/:id"
* workflow
   * fetch single wishlist by ID
   * include user and product details

### 4. Remove from Wishlist
* route name : DELETE "/wishlist/:id"
* workflow
   * user authentication required
   * check if wishlist item exists
   * remove item from wishlist if user is the owner

### 5. Update Wishlist
* route name : PATCH "/wishlist/:id"
* workflow
   * (Not

## Module Name: Cart
Cart manages shopping cart functionality.

### 1. Add to Cart
* route name : POST "/cart/"
* workflow
   * user authentication required
   * validate body
      * productId (required, numeric string)
      * flavorId (required, numeric string)
      * sizeId (required, numeric string)
      * quantity (required, positive integer)
   * check product, flavor, and size availability
   * check for sufficient stock
   * if item already exists in cart, update quantity; otherwise, create new cart item
   * create a cart for the user if one doesn't exist

### 2. Get All Carts (Admin)
* route name : GET "/cart/"
* workflow
   * fetch all carts with pagination and filtering
   * filter by userId and productId

### 3. Get User's Cart
* route name : GET "/cart/single-cart"
* workflow
   * user authentication required
   * fetch the current user's cart with detailed item information

### 4. Update Cart Item
* route name : PATCH "/cart/:cartItemId"
* workflow
   * user authentication required
   * validate body
      * quantity (required, positive integer)
   * check if cart item exists and belongs to the user
   * check for sufficient stock
   * update cart item quantity

### 5. Remove from Cart
* route name : DELETE "/cart/:cartItemId"
* workflow
   * user authentication required
   * check if cart item exists and belongs to the user
   * remove item from cart

## Module Name: Review
Review manages product reviews and ratings.

### (Not implemented)

## Module Name: Offer


### (Not implemented)