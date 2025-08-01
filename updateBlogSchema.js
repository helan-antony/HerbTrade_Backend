const mongoose = require('mongoose');
const Blog = require('./models/Blog');
require('dotenv').config();

async function updateBlogSchema() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/herbtrade', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Update all existing blog posts to have the new fields
    const result = await Blog.updateMany(
      {}, // Update all documents
      {
        $set: {
          likes: [],
          views: 0,
          updatedAt: new Date()
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} blog posts with new schema fields`);

    // Verify the update
    const blogs = await Blog.find({});
    console.log('Current blog posts:');
    blogs.forEach((blog, index) => {
      console.log(`${index + 1}. ${blog.title}`);
      console.log(`   - ID: ${blog._id}`);
      console.log(`   - Likes: ${blog.likes?.length || 0}`);
      console.log(`   - Views: ${blog.views || 0}`);
      console.log(`   - Created: ${blog.createdAt}`);
      console.log(`   - Updated: ${blog.updatedAt}`);
      console.log('');
    });

    console.log('Blog schema update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating blog schema:', error);
    process.exit(1);
  }
}

// Run the update function
updateBlogSchema();
