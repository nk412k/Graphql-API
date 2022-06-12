const fs=require('fs');
const path=require('path');

const deleteImage = (filepath) => {
  filepath = path.join(__dirname, "..", filepath);
  fs.unlink(filepath, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

exports.deleteImage=deleteImage;