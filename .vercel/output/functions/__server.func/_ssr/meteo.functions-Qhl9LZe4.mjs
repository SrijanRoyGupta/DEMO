import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/meteo.functions-Qhl9LZe4.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getLiveNetwork = createServerFn({ method: "GET" }).handler(createSsrRpc("53fc19855d8cf73959bf301b9d1e600aed716390ce9e8c6c1cd969f51cfd8be3"));
var searchPlace = createServerFn({ method: "POST" }).validator((data) => {
	if (!data || typeof data.query !== "string") throw new Error("Enter a location");
	const query = data.query.trim();
	if (query.length < 2) throw new Error("Enter a location");
	return { query };
}).handler(createSsrRpc("90ffbf6b1e81f4d49da984e230c56428db30a1c1cc0a1b6650350762536150e8"));
//#endregion
export { searchPlace as n, getLiveNetwork as t };
