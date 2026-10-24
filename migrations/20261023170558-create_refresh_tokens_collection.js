module.exports = {
  async up(db) {
    // The app may have created the collection already when Mongoose initialized
    // the model, so only create it when it does not exist.
    const collectionExists = await db
      .listCollections({ name: "refreshtokens" }, { nameOnly: true })
      .hasNext();

    if (!collectionExists) {
      await db.createCollection("refreshtokens");
    }

    // Ensure each token hash is unique
    await db.collection("refreshtokens").createIndex(
      { tokenHash: 1 },
      { unique: true }
    );

    // Find refresh tokens belonging to a user
    await db.collection("refreshtokens").createIndex({ user: 1 });

    // Automatically clean up expired tokens eventually
    await db.collection("refreshtokens").createIndex(
      { expiresAt: 1 },
      {
        expireAfterSeconds: 0,
      }
    );
  },

  async down(db) {
    // Remove the collection and its indexes
    await db.collection("refreshtokens").drop();
  },
};
