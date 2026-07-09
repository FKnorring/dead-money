import '@testing-library/jest-dom';

// jsdom doesn't implement HTMLDialogElement methods — polyfill for tests
HTMLDialogElement.prototype.showModal = function () {
	this.setAttribute('open', '');
	this.open = true;
};
HTMLDialogElement.prototype.close = function () {
	this.removeAttribute('open');
	this.open = false;
};
