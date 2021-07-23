"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = exports.schema = exports.teamConnection = exports.userConnection = exports.nodeField = exports.nodeInterface = exports.resolveInfo = void 0;
/*!
 * ISC License
 *
 * Copyright (c) 2018-present, Mykhailo Stadnyk <mikhus@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
const graphql_1 = require("graphql");
const graphql_relay_1 = require("graphql-relay");
const uuid = require("uuid");
exports.resolveInfo = {};
_a = graphql_relay_1.nodeDefinitions(async (globalId) => {
    const { type, id } = graphql_relay_1.fromGlobalId(globalId);
    const node = { id, __typename: type };
    return node;
}), exports.nodeInterface = _a.nodeInterface, exports.nodeField = _a.nodeField;
const Stats = new graphql_1.GraphQLObjectType({
    name: 'Stats',
    interfaces: [exports.nodeInterface],
    fields: {
        id: graphql_relay_1.globalIdField('Stats', (stats) => stats.id),
        points: { type: graphql_1.GraphQLFloat },
        assists: { type: graphql_1.GraphQLBoolean },
    },
});
const User = new graphql_1.GraphQLObjectType({
    name: 'User',
    interfaces: [exports.nodeInterface],
    fields: {
        id: graphql_relay_1.globalIdField('User', (user) => user.id),
        firstName: { type: graphql_1.GraphQLString },
        lastName: { type: graphql_1.GraphQLString },
        phoneNumber: { type: graphql_1.GraphQLString },
        email: { type: graphql_1.GraphQLString },
        address: { type: graphql_1.GraphQLString },
        stats: { type: Stats },
    },
});
exports.userConnection = graphql_relay_1.connectionDefinitions({ nodeType: User }).connectionType;
const Team = new graphql_1.GraphQLObjectType({
    name: 'Team',
    interfaces: [exports.nodeInterface],
    fields: {
        id: graphql_relay_1.globalIdField('Team', (team) => team.id),
        name: { type: graphql_1.GraphQLString },
        stats: { type: Stats },
        users: { type: new graphql_1.GraphQLList(User) },
    },
});
exports.teamConnection = graphql_relay_1.connectionDefinitions({ nodeType: Team }).connectionType;
const Viewer = new graphql_1.GraphQLObjectType({
    name: 'Viewer',
    fields: {
        users: {
            type: exports.userConnection,
            args: Object.assign({}, graphql_relay_1.connectionArgs),
        },
        teams: {
            type: exports.teamConnection,
            args: Object.assign({}, graphql_relay_1.connectionArgs),
        },
    },
});
const Query = new graphql_1.GraphQLObjectType({
    name: 'Query',
    fields: {
        node: exports.nodeField,
        viewer: {
            type: Viewer,
            resolve(src, args, context, info) {
                exports.resolveInfo[context.queryId] = info;
                return graphql_relay_1.connectionFromArray([], args);
            },
        },
    },
});
exports.schema = new graphql_1.GraphQLSchema({
    query: Query,
});
/**
 * Executes a test query and returns resolver info object
 *
 * @param {string} query
 * @param {*} vars
 * @return {GraphQLResolveInfo}
 */
async function exec(query, vars) {
    const queryId = uuid.v4();
    await graphql_1.graphql(exports.schema, query, null, { queryId }, vars);
    const info = exports.resolveInfo[queryId];
    delete exports.resolveInfo[queryId];
    return info;
}
exports.exec = exec;
//# sourceMappingURL=schema.js.map