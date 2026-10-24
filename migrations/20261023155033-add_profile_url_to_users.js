module.exports = {
  async up(db) {
    await db.collection("users").updateMany(
      { profileUrl: { $exists: false } },
      { $set: { profileUrl: null } }
    );

    console.log("Added profileUrl to existing users");
  },

  async down(db) {
    await db.collection("users").updateMany(
      { profileUrl: null },
      { $unset: { profileUrl: "" } }
    );

    console.log("Rolled back profileUrl migration");
  },
};