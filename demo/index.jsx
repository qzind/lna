import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {detectLna, LnaError} from "src";
import {connectWebSocket} from "src/wrappers";

const originAddressSpace = window['lna_origin_address_space'];

function App() {
	const [log, setLog] = useState([]);

	function addLogEntry(entry) {
		setLog(log => [...log, entry]);
	}

	async function handleClick({protocol, url, type, space}) {
		url ??= window[`lna_${space}_${type}_url`];
		const ws = protocol === 'ws';
		try {
			const response = await detectLna(
				url,
				ws ? connectWebSocket : fetch,
				{
					isWebSocket: ws, overrides: {
						targetAddressSpace: space,
						originAddressSpace: originAddressSpace,
					},
				}
			);
			addLogEntry({type, space, protocol, result: response});
		} catch (e) {
			addLogEntry({type, space, protocol, error: e});
		}
	}

	const spaces = ['public', 'local', 'loopback'];

	return <>
		<h1>LNA Detect Demo</h1>
		Click one of the buttons below to connect to a server
		via <code>fetch</code> or <code>WebSocket</code> that's in
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
					<ConnectButtons type={'success'} space={s} onClick={handleClick}/>
				</td>)}
			</tr>
			<tr>
				<th>Failing</th>

				{spaces.map(s => <td key={s}>
					<ConnectButtons type={'fail'} space={s} onClick={handleClick}/>
				</td>)}
			</tr>
			</tbody>
		</table>
		<ol>
			{log.map((entry, i) => <li key={i}><LogEntry entry={entry}/></li>)}
		</ol>

		<p>or connect to an URL of your own:</p>
		<ConnectUrlForm onClick={handleClick}/>
	</>;
}

function ConnectUrlForm({onClick}) {
	function handleSubmit(e) {
		e.preventDefault();
		const formData = new FormData(e.target);
		const url = formData.get('url');
		const protocol = formData.get('protocol');
		onClick({protocol, url});
	}

	return <form onSubmit={handleSubmit}>
		<input name="url" defaultValue="http://localhost:8000"/>
		<input type="radio" name="protocol" id="http" value="http" defaultChecked/>
		<label htmlFor="http">fetch</label>
		<input type="radio" name="protocol" id="ws" value="ws"/>
		<label htmlFor="ws">WebSocket</label>
		<button type="submit">Connect</button>
	</form>
}

function ConnectButtons({type, space, onClick}) {
	return <>
		<ConnectButton
			onClick={() => onClick({protocol: 'http', type, space})}
		>
			fetch
		</ConnectButton>
		<ConnectButton
			onClick={() => onClick({protocol: 'ws', type, space})}
		>
			WebSocket
		</ConnectButton>
	</>
}

function ConnectButton({onClick, children}) {
	return <button onClick={onClick}>{children}</button>;
}

function LogEntry({entry}) {
	const {type, space, protocol, error, result} = entry;
	const logPrefix = `[${type}][${space}][${protocol}]`;
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
