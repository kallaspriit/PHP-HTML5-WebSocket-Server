<?php

error_reporting(E_ALL);


require_once '../SocketServer.php';

/*
function exceptionErrorHandler($code, $message, $file, $line, $context) {
	throw new Exception($message.' ['.$file.':'.$line.']', $code);
}

set_error_handler('exceptionErrorHandler');
*/

/**
 * Class representing a socket command
 */
class SocketCommand {

	private $controller;
	private $action;
	private $parameters;

	public function __construct($controller, $action, array $parameters = array()) {
		$this->controller = $controller;
		$this->action = $action;
		$this->parameters = $parameters;
	}

	public function getController() {
		return $this->controller;
	}

	public function getAction() {
		return $this->action;
	}

	public function getParams() {
		return $this->parameters;
	}

	public function getParam($name, $default = null) {
		if (array_key_exists($name, $this->parameters)) {
			return $this->parameters[$name];
		} else {
			return $default;
		}
	}

	public function __toString() {
		$data = array(
			'controller' => $this->controller,
			'action' => $this->action,
			'parameters' => $this->parameters
		);

		return json_encode($data);
	}

}

/**
 * Socket router routes requests to controller actions
 */
class SocketRouter {

	private static $controllers = array();

	public static function route(SocketServer $server, SocketClient $sender, array $request) {
		if (!isset($request['controller']) || !isset($request['action'])) {
			throw new Exception('Missing controller name');
		}

		if (!isset($request['action'])) {
			throw new Exception('Missing action name');
		}

		$controllerName = self::getControllerName($request['controller']);
		$actionName = self::getActionName($request['action']);

		if (!class_exists($controllerName)) {
			throw new Exception('Controller class "' . $controllerName . '" not found');
		}

		if (!isset(self::$controllers[$controllerName])) {
			self::$controllers[$controllerName] = new $controllerName();
		}

		if (!is_callable(array(self::$controllers[$controllerName], $actionName))) {
			throw new Exception('Controller method "' . $controllerName . '::' . $actionName . '" is not callable');
		}

		$parameters = array();

		if (isset($request['parameters']) && is_array($request['parameters'])) {
			$parameters = $request['parameters'];
		}

		$command = new SocketCommand($request['controller'], $request['action'], $parameters);

		call_user_func_array(array(self::$controllers[$controllerName], $actionName), array($server, $sender, $command));
	}

	// convert "user-manager" to "UserManagerController" etc
	private static function getControllerName($requestedController) {
		return str_replace(' ', '', ucwords(str_replace('-', ' ', $requestedController))) . 'Controller';
	}

	// convert "add-user" to "addUserAction" etc
	private static function getActionName($requestedAction) {
		$actionName = $requestedAction;

		do {
			$dashPos = strpos($actionName, '-');

			if ($dashPos === false) {
				break;
			}

			$actionName = substr($actionName, 0, $dashPos) . strtoupper(substr($actionName, $dashPos + 1, 1)) . substr($actionName, $dashPos + 2);
		} while (true);

		$actionName .= 'Action';

		return $actionName;
	}

}

class ServerController {

	private $goodColors = array(
		'#FF0000',
		'#00FF00',
		'#0000FF',
		'#FFFF00',
		'#00FFFF',
		'#FF00FF'
	);

	private $drawnLines = array();

	private static function randomColor(){
		$color = '';

		while(strlen($color) < 6){
			$color .= sprintf("%02X", mt_rand(0, 100));
		}

		return '#'.$color;
	}

	public function helloAction(SocketServer $server, SocketClient $sender, SocketCommand $command) {
		$color = null;

		if ($sender->id < count($this->goodColors)) {
			$color = $this->goodColors[$sender->id - 1];
		} else {
			$color = self::randomColor();
		}

		$sender->set('color', $color);

		$clients = $server->getClients();
		$existingUsers = array();

		foreach ($clients as $client) {
			if ($client != $sender) {
				$existingUsers[] = array(
					'id' => $client->id,
					'color' => $client->get('color'),
					'name' => $client->get('name'),
				);
			}
		}

		$sender->send(new SocketCommand('client', 'welcome', array(
			'id' => $sender->id,
			'color' => $sender->get('color'),
			'users' => $existingUsers,
		)));

		foreach ($clients as $client) {
			$client->send(new SocketCommand('client', 'user-connected', array('id' => $sender->id, 'color' => $color)));
		}
	}

	public function setNameAction(SocketServer $server, SocketClient $sender, SocketCommand $command) {
		$name = ucwords($command->getParam('name'));

		if (empty($name)) {
			throw new Exception('Empty name not allowed');
		}

		$sender->set('name', $name);

		$clients = $server->getClients();

		foreach ($clients as $client) {
			$client->send(new SocketCommand('client', 'name-changed', array('id' => $sender->id, 'name' => $name)));
		}
	}

	public function strokeLineAction(SocketServer $server, SocketClient $sender, SocketCommand $command) {
		$line = array(
			'color' => $sender->get('color'),
			'x1' => $command->getParam('x1'),
			'y1' => $command->getParam('y1'),
			'x2' => $command->getParam('x2'),
			'y2' => $command->getParam('y2')
		);

		$senderLines = $sender->get('graphics.lines', array());
		$senderLines[] = $line;
		$sender->set('graphics.lines', $senderLines);

		$this->drawnLines[] = $line;

		$clients = $server->getClients();

		foreach ($clients as $client) {
			$client->send(new SocketCommand('client', 'stroke-line', array(
				'id' => $sender->id,
				'x1' => $command->getParam('x1'),
				'y1' => $command->getParam('y1'),
				'x2' => $command->getParam('x2'),
				'y2' => $command->getParam('y2')
			)));
		}
	}

	public function requestRestoreAction(SocketServer $server, SocketClient $sender, SocketCommand $command) {
		$sender->send(new SocketCommand('client', 'restore', array(
			'lines' => $this->drawnLines
		)));
	}
}

class Server implements SocketListener {
	public function onMessageRecieved(
		SocketServer $server,
		SocketClient $sender,
		$message
	) {
		$request = json_decode($message, true);

		if (isset($request)) {
			SocketRouter::route($server, $sender, $request);
		}
	}

	public function onClientConnected(SocketServer $server, SocketClient $newClient) {
		$clients = $server->getClients();

		foreach ($clients as $client) {
			if ($newClient != $client) {
				$client->send(new SocketCommand('client', 'user-connecting', array('id' => $newClient->id)));
			}
		}
	}

	public function onClientDisconnected(SocketServer $server, SocketClient $leftClient) {
		$clients = $server->getClients();

		foreach ($clients as $client) {
			if ($client != $leftClient) {
				$client->send(new SocketCommand('client', 'user-disconnected', array('id' => $leftClient->id)));
			}
		}
	}

	public function onLogMessage(
		SocketServer $server,
		$message
	) {
		echo $message."\n";
	}
}

try {
	$server = new Server();

	$webSocket = new SocketServer('socket', 8999);
	$webSocket->addListener($server);
	$webSocket->start();
} catch (Exception $e) {
	echo 'Fatal exception occured: '.$e->getMessage().' in '.$e->getFile().' on line '.$e->getLine()."\n";
}