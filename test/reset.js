module.exports = async (app) => {
  // Clear database
  const mongooseClient = app.get('mongooseClient');
  await mongooseClient.connection.dropDatabase();
  await Promise.all(
    Object
      .values(mongooseClient.models)
      .map((model) => model.createIndexes()),
  );
};
