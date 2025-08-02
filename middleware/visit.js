import Visitor from '../models/visitor.js';

export const trackVisitor = async (req, res, next) => {
  try {
    // Avoid counting admin or API routes
    if (req.path.startsWith('/api/admin')) return next();

    // Get the only visitor document (or create it)
    let visitorData = await Visitor.findOne();
    if (!visitorData) {
      visitorData = await Visitor.create({ count: 1 });
    } else {
      visitorData.count += 1;
      await visitorData.save();
    }
  } catch (error) {
    console.error('Visitor tracking error:', error);
  }
  next();
};
