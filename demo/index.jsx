import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {detectLna, LnaError} from "src";

const originAddressSpace = window['lna_origin_address_space'];

function App() {
	const [log, setLog] = useState([]);

	function addLogEntry(entry) {
		setLog(log => [...log, entry]);
	}

	async function handleClick(type, space) {
		const url = window[`lna_${space}_${type}_url`];
		try {
			const response = await detectLna(url, fetch, {
				isWebSocket: false, overrides: {
					targetAddressSpace: space, originAddressSpace: originAddressSpace,
				},
			});
			addLogEntry({type, space, result: response});
		} catch (e) {
			addLogEntry({type, space, error: e});
		}
	}

	const spaces = ['public', 'local', 'loopback'];

	return <>
		<h1>LNA Detect Demo</h1>
		Click one of the buttons below to connect to a server that's in
		<ul>
			<li>public</li>
			<li>local or</li>
			<li>loopback</li>
		</ul>
		address space (via browser CLI arg overrides) and that either returns a
		<ul>
			<li>valid response ("Succeeding") or</li>
			<li>terminates the connection without a response ("Failing").</li>
		</ul>

		<table>
			<thead>
			<tr>
				<th>
				</th>
				<th>Public</th>
				<th>Local</th>
				<th>Loopback</th>
			</tr>
			</thead>
			<tbody>
			<tr>
				<th>Succeeding</th>
				{spaces.map(s => <td key={s}>
					<ConnectButton type="success" space={s}
					               onClick={() => handleClick('success', s)}
					/>
				</td>)}
			</tr>
			<tr>
				<th>Failing</th>

				{spaces.map(s => <td key={s}>
					<ConnectButton type="success" space={s}
					               onClick={() => handleClick('fail', s)}
					/>
				</td>)}
			</tr>
			</tbody>
		</table>
		<ol>
			{log.map((entry, i) => <li key={i}><LogEntry entry={entry}/></li>)}
		</ol>
	</>;
}

function ConnectButton({onClick}) {
	return <button onClick={onClick}>Connect</button>;
}

function LogEntry({entry}) {
	const {type, space, error, result} = entry;
	const logPrefix = `[${type}][${space}]`;
	return <>{logPrefix} <LogMsg error={error} result={result}/></>;
}

function LogMsg({error, result}) {
	if (result && ! error) {
		return <>Connection successful</>;
	}
	if (! (error instanceof LnaError)) {
		return <>Connection failed with unknown error: {error.message}</>
	}
	const perm = error.permission?.name ?? 'unknown';
	if (error.denied) {
		return <>Connection was denied with permission {perm}</>
	} else if (error.denied === false && error.permission === null) {
		return <>Connection was unrestricted, but failed for other reasons: {error.cause.message}</>
	} else if (error.denied === false) {
		return <>Connection was granted with permission {perm}, but failed for other
			reasons: {error.cause.message}</>
	} else if (error.denied === undefined) {
		return <>Connection failed, it's unknown whether it was denied or
			not: {error.cause.message}</>
	}
}

createRoot(document.body).render(<App/>);
