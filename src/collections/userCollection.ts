/**
 * 
 * Reference: Laravel HTTP Resource Collection
 * 
 */
const single = (data: any) => {
  if (!data) return null;

  return {
    username: data.username,
    email: data.email,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

exports.single = single;
exports.collection = (datas: any) => datas.map(single);
