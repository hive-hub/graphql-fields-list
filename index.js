"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldsProjection = exports.fieldsList = exports.fieldsMap = void 0;
/**
 * Pre-compiled wildcard replacement regexp
 *
 * @type {RegExp}
 */
const RX_AST = /\*/g;
/**
 * Retrieves a list of nodes from a given selection (either fragment or
 * selection node)
 *
 * @param {FragmentDefinitionNode | FieldNode} selection
 * @return {ReadonlyArray<FieldNode>}
 * @access private
 */
function getNodes(selection) {
    var _a, _b;
    return (((_b = (_a = selection) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections) ||
        []);
}
/**
 * Checks if a given directive name and value valid to return a field
 *
 * @param {string} name
 * @param {boolean} value
 * @return boolean
 * @access private
 */
function checkValue(name, value) {
    return name === "skip" ? !value : name === "include" ? value : true;
}
/**
 * Checks if a given directive arg allows to return field
 *
 * @param {string} name - directive name
 * @param {ArgumentNode} arg
 * @param {VariablesValues} vars
 * @return {boolean}
 * @access private
 */
function verifyDirectiveArg(name, arg, vars) {
    switch (arg.value.kind) {
        case "BooleanValue":
            return checkValue(name, arg.value.value);
        case "Variable":
            return checkValue(name, vars[arg.value.name.value]);
    }
    return true;
}
/**
 * Checks if a given directive allows to return field
 *
 * @param {DirectiveNode} directive
 * @param {VariablesValues} vars
 * @return {boolean}
 * @access private
 */
function verifyDirective(directive, vars) {
    const directiveName = directive.name.value;
    if (!~["include", "skip"].indexOf(directiveName)) {
        return true;
    }
    let args = directive.arguments;
    if (!(args && args.length)) {
        args = [];
    }
    for (const arg of args) {
        if (!verifyDirectiveArg(directiveName, arg, vars)) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if a given list of directives allows to return field
 *
 * @param {ReadonlyArray<DirectiveNode>} directives
 * @param {VariablesValues} vars
 * @return {boolean}
 * @access private
 */
function verifyDirectives(directives, vars) {
    if (!directives || !directives.length) {
        return true;
    }
    vars = vars || {};
    for (const directive of directives) {
        if (!verifyDirective(directive, vars)) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if a given node is inline fragment and process it,
 * otherwise does nothing and returns false.
 *
 * @param {SelectionNode} node
 * @param {MapResult | MapResultKey} root
 * @param {*} skip
 * @param {TraverseOptions} opts
 */
function verifyInlineFragment(node, root, opts, skip) {
    if (node.kind === "InlineFragment") {
        const nodes = getNodes(node);
        nodes.length && traverse(nodes, root, opts, skip);
        return true;
    }
    return false;
}
/**
 * Builds skip rules tree from a given skip option argument
 *
 * @param {string[]} skip - skip option arguments
 * @return {SkipTree} - skip rules tree
 */
function skipTree(skip) {
    const tree = {};
    for (const pattern of skip) {
        const props = pattern.split(".");
        let propTree = tree;
        for (let i = 0, s = props.length; i < s; i++) {
            const prop = props[i];
            const all = props[i + 1] === "*";
            if (!propTree[prop]) {
                propTree[prop] = i === s - 1 || all ? true : {};
                all && i++;
            }
            propTree = propTree[prop];
        }
    }
    return tree;
}
/**
 *
 * @param node
 * @param skip
 */
function verifySkip(node, skip) {
    if (!skip) {
        return false;
    }
    // true['string'] is a valid operation is JS resulting in `undefined`
    if (skip[node]) {
        return skip[node];
    }
    // lookup through wildcard patterns
    let nodeTree = false;
    const patterns = Object.keys(skip).filter((pattern) => ~pattern.indexOf("*"));
    for (const pattern of patterns) {
        const rx = new RegExp(pattern.replace(RX_AST, ".*"));
        if (rx.test(node)) {
            nodeTree = skip[pattern];
            // istanbul ignore else
            if (nodeTree === true) {
                break;
            }
        }
    }
    return nodeTree;
}
/**
 * Traverses recursively given nodes and fills-up given root tree with
 * a requested field names
 *
 * @param {ReadonlyArray<FieldNode>} nodes
 * @param {MapResult | MapResultKey} root
 * @param {TraverseOptions} opts
 * @param {SkipValue} skip
 * @return {MapResult}
 * @access private
 */
function traverse(nodes, root, opts, skip) {
    for (const node of nodes) {
        if (opts.withVars && !verifyDirectives(node.directives, opts.vars)) {
            continue;
        }
        if (verifyInlineFragment(node, root, opts, skip)) {
            continue;
        }
        const name = node.name.value;
        if (opts.fragments[name]) {
            traverse(getNodes(opts.fragments[name]), root, opts, skip);
            continue;
        }
        const nodes = getNodes(node);
        const nodeSkip = verifySkip(name, skip);
        if (nodeSkip !== true) {
            root[name] =
                root[name] || (nodes.length ? {} : false);
            nodes.length &&
                traverse(nodes, root[name], opts, nodeSkip);
        }
    }
    return root;
}
/**
 * Retrieves and returns a branch from a given tree by a given path
 *
 * @param {MapResult} tree
 * @param {string} [path]
 * @return {MapResult}
 * @access private
 */
function getBranch(tree, path) {
    if (!path) {
        return tree;
    }
    for (const fieldName of path.split(".")) {
        const branch = tree[fieldName];
        if (!branch) {
            return {};
        }
        tree = branch;
    }
    return tree;
}
/**
 * Verifies if a given info object is valid. If valid - returns
 * proper FieldNode object for given resolver node, otherwise returns null.
 *
 * @param {GraphQLResolveInfo} info
 * @return {FieldNode | null}
 * @access private
 */
function verifyInfo(info) {
    if (!info) {
        return null;
    }
    if (!info.fieldNodes && info.fieldASTs) {
        info.fieldNodes = info.fieldASTs;
    }
    if (!info.fieldNodes) {
        return null;
    }
    return verifyFieldNode(info);
}
/**
 * Verifies if a proper fieldNode existing on given info object
 *
 * @param {GraphQLResolveInfo} info
 * @return {FieldNode | null}
 * @access private
 */
function verifyFieldNode(info) {
    const fieldNode = info.fieldNodes.find((node) => node && node.name && node.name.value === info.fieldName);
    if (!(fieldNode && fieldNode.selectionSet)) {
        return null;
    }
    return fieldNode;
}
/**
 * Parses input options and returns prepared options object
 *
 * @param {FieldsListOptions} options
 * @return {FieldsListOptions}
 * @access private
 */
function parseOptions(options) {
    if (!options) {
        return {};
    }
    if (options.withDirectives === undefined) {
        options.withDirectives = true;
    }
    return options;
}
/**
 * Extracts and returns requested fields tree.
 * May return `false` if path option is pointing to leaf of tree
 *
 * @param {GraphQLResolveInfo} info
 * @param {FieldsListOptions} options
 * @return {MapResult}
 * @access public
 */
function fieldsMap(info, options) {
    const fieldNode = verifyInfo(info);
    if (!fieldNode) {
        return {};
    }
    const { path, withDirectives, skip } = parseOptions(options);
    const tree = traverse(getNodes(fieldNode), {}, {
        fragments: info.fragments,
        vars: info.variableValues,
        withVars: withDirectives,
    }, skipTree(skip || []));
    return getBranch(tree, path);
}
exports.fieldsMap = fieldsMap;
/**
 * Extracts list of selected fields from a given GraphQL resolver info
 * argument and returns them as an array of strings, using the given
 * extraction options.
 *
 * @param {GraphQLResolveInfo} info - GraphQL resolver info object
 * @param {FieldsListOptions} [options] - fields list extraction options
 * @return {string[]} - array of field names
 * @access public
 */
function fieldsList(info, options = {}) {
    return Object.keys(fieldsMap(info, options)).map((field) => (options.transform || {})[field] || field);
}
exports.fieldsList = fieldsList;
/**
 * Combines parent path with child name to fully-qualified dot-notation path
 * of a child
 *
 * @param {string} parent
 * @param {string} child
 * @return {string}
 * @access private
 */
function toDotNotation(parent, child) {
    return `${parent ? parent + "." : ""}${child}`;
}
/**
 * Extracts projection of selected fields from a given GraphQL resolver info
 * argument and returns flat fields projection object, where keys are object
 * paths in dot-notation form.
 *
 * @param {GraphQLResolveInfo} info - GraphQL resolver info object
 * @param {FieldsListOptions} options - fields list extraction options
 * @return {FieldsProjection} - fields projection object
 * @access public
 */
function fieldsProjection(info, options) {
    const tree = fieldsMap(info, options);
    const stack = [];
    const map = {};
    const transform = (options || {}).transform || {};
    stack.push({ node: "", tree });
    while (stack.length) {
        for (const j of Object.keys(stack[0].tree)) {
            if (stack[0].tree[j]) {
                const nodeDottedName = toDotNotation(stack[0].node, j);
                stack.push({
                    node: nodeDottedName,
                    tree: stack[0].tree[j],
                });
                if (options === null || options === void 0 ? void 0 : options.keepParentField)
                    map[nodeDottedName] = 1;
                continue;
            }
            let dotName = toDotNotation(stack[0].node, j);
            if (transform[dotName]) {
                dotName = transform[dotName];
            }
            map[dotName] = 1;
        }
        stack.shift();
    }
    return map;
}
exports.fieldsProjection = fieldsProjection;
// istanbul ignore next
if (process.env["IS_UNIT_TEST"]) {
    // noinspection JSUnusedGlobalSymbols
    Object.assign(module.exports, {
        getNodes,
        traverse,
        getBranch,
        verifyDirectives,
        verifyDirective,
        verifyDirectiveArg,
        checkValue,
        verifyInfo,
        verifyFieldNode,
        verifyInlineFragment,
        verifySkip,
        parseOptions,
        toDotNotation,
    });
}
//# sourceMappingURL=index.js.map