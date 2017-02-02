module.exports = {
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true
        }
    },
    env: {
        es6: true,
        browser: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:react/recommended",
    ],
    plugins: ["import","react", "prettier"],
    rules: {
      "prettier/prettier": ["error",{tabWidth: 4}],
      "react/prop-types": "off",
    }
};
