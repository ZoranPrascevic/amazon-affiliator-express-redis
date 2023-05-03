const db = require("../db/db-connection");
const { multipleColumnSet } = require("../utils/common.utils");
const Role = require("../utils/userRoles.utils");


class UserModel {
    tableName = "user";

    find = async (params = {}) => {
        let sql = `SELECT * FROM ${this.tableName}`;

        if (!Object.keys(params).length) {
            return await db.query(sql);
        }

        const { columnSet, values } = multipleColumnSet(params);
        sql += ` WHERE ${columnSet}`;

        return await db.query(sql, [...values]);
    };

    findOne = async (params) => {
        const { columnSet, values } = multipleColumnSet(params);

        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE ${columnSet}
        `;

        const result = await db.query(sql, [...values]);

        return result[0];
    };

    create = async ({
        username,
        password,
        first_name,
        last_name,
        email,
        role = Role.SuperUser,
        age,
    }) => {

        const sql = `
            INSERT INTO ${this.tableName}
            (username, password, first_name, last_name, email, role, age) VALUES (?,?,?,?,?,?,?)
        `;

        const result = await db.query(sql, [
            username,
            password,
            first_name,
            last_name,
            email,
            role,
            age,
        ]);

        const affectedRows = result ? result.affectedRows : 0;

        return affectedRows;
    };

    update = async (params, id) => {
        const { columnSet, values } = multipleColumnSet(params);

        const sql = `UPDATE user SET ${columnSet} WHERE id = ?`;

        const result = await db.query(sql, [...values, id]);

        return result;
    };

    delete = async (id) => {
        const sql = `
            DELETE FROM ${this.tableName}
            WHERE id = ?
        `;
        const result = await db.query(sql, [id]);
        const affectedRows = result ? result.affectedRows : 0;

        return affectedRows;
    };
}

module.exports = new UserModel();
