const errorHandler = (err, req, res, next) => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  console.error(NODE_ENV === 'production' ? err.message : err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ msg: 'Validation error', errors: messages });
  }

  if (err.code === 11000) {
    return res.status(400).json({ msg: 'Duplicate field value' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ msg: 'Resource not found' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ msg: 'File too large' });
    }
    return res.status(400).json({ msg: err.message });
  }

  res.status(err.statusCode || 500).json({
    msg: err.message || 'Server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
