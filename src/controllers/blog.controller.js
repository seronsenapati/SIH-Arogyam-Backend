const Blog = require('../models/Blog');
const Joi = require('joi');
const catchAsync = require('../middleware/catchAsync');
const { validateBlog } = require('../middleware/validation.middleware');

// Validation schemas
const createBlogSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).optional(),
  published: Joi.boolean().optional()
});

const getAll = catchAsync(async (req, res) => {
  // Only fetch published posts for non-admins
  const query = req.user && req.user.role === 'admin' ? {} : { published: true };
  
  const posts = await Blog.find(query)
    .populate('authorId', 'email')
    .sort({ createdAt: -1 });
  
  res.json({
    ok: true,
    data: posts
  });
});

const create = catchAsync(async (req, res) => {
  // Only admins, doctors, and consultants can create blog posts
  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && req.user.role !== 'consultant') {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not authorized to create blog posts'
      }
    });
  }
  
  const { error } = createBlogSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  
  const { title, content, tags, published } = req.body;
  const authorId = req.user._id;
  
  // Generate slug from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Check if slug already exists
  const existingBlog = await Blog.findOne({ slug });
  if (existingBlog) {
    return res.status(409).json({
      ok: false,
      error: {
        code: 'DUPLICATE_SLUG',
        message: 'A post with this title already exists'
      }
    });
  }
  
  // Create blog post
  const blog = new Blog({
    authorId,
    title,
    slug,
    content,
    tags: tags || [],
    published: published || false
  });
  
  await blog.save();
  
  res.status(201).json({
    ok: true,
    data: blog
  });
});

module.exports = {
  getAll,
  create
};