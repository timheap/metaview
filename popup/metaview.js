// alert("hello");
const popup = document.getElementById('popup-content');

var RenderableMixin = Base => class extends Base {
	render() { throw new Error("Not implemented"); }
	getContent() {
		if (this.el) {
			return this.el;
		}
		return (this.el = this.render());
	}

	mount(parent) {
		parent.appendChild(this.getContent());
		return this;
	}
	dismount() {
		const el = this.getContent();
		if (el.parentNode) {
			el.parentNode.removeChild(this.el);
		}
	}
}


class MetatagFamily extends RenderableMixin(Object) {
	constructor(tagList) {
		super();
		this.tagList = tagList;
	}

	static handles(tag) { return False; }
	static tabInfo() { throw new Error("Not implemented"); }
	tab() {
		return Object.assign({
			content: this,
		}, this.constructor.tabInfo());
	}
	render() {
		return el('div', {children: [this.constructor.tabInfo().name]});
	}
	renderHTMLTag(name, attrs) {
		const attrBits = Object.entries(attrs).reduce((base, bits) => {
			let name = bits[0];
			let value = bits[1].replace(/[\\"]/, '\\\0');
			return base.concat([
				' ',
				el('span', {classList: 'tag--attr', children: [name]}),
				'="',
				el('span', {classList: 'tag--value', children: [value]}),
				'"'
			]);
		}, []);
		return el('code', {
			classList: 'tag',
			children: [].concat(['<', name], attrBits, ['>']),
		});
	}
	renderTagTable(tags, name, content) {
		name = (name || 'name');
		content = (content || 'content');
		return el('table', {
			classList: 'tag-table',
			children: tags.map((tag) => {
				return el('tr', {children: [
					el('th', {children: [tag[name]]}),
					el('td', {children: [tag[content]]}),
				]});
			}),
		});
	};
}


class FacebookTags extends MetatagFamily {
	constructor(tagList) {
		const knownTags = {}
		const otherTags = [];
		for (let tag of tagList) {
			if (tag.property == 'og:title') {
				knownTags.title = tag.content;
			} else if (tag.property == 'og:description') {
				knownTags.description = tag.content;
			} else if (tag.property == 'og:image') {
				knownTags.image = tag.content;
			} else {
				otherTags.push(tag);
			}
		}
		super(otherTags);
		this.knownTags = knownTags;
	}

	static handles(tag) {
		if (!('property' in tag)) return false;
		const property = tag['property'];
		if (property.indexOf('og:') == 0) return true;
		if (property.indexOf('fb:') == 0) return true;
		if (property.indexOf('article:') == 0) return true;
		return false;
	}

	static tabInfo() {
		return {
			id: 'facebook',
			name: 'Facebook',
			icon: '/icons/facebook-f.svg',
		};
	}

	render() {
		return el('div', {
			classList: 'facebook',
			children: [
				this.renderCard(),
				this.renderTagTable(this.tagList, 'property'),
			],
		})
	}
	renderCard() {
		if (Object.keys(this.knownTags).length == 0) {
			return null;
		}

		const children = [];
		if (this.knownTags.image) {
			children.push(el('img', {
				classList: 'facebook--image',
				attrs: {'src': this.knownTags.image},
			}));
		}
		children.push(el('p', {
			classList: 'facebook--title',
			children: [this.knownTags.title]
		}));
		if (this.knownTags.description) {
			children.push(el('p', {
				classList: 'facebook--description',
				children: [this.knownTags.description],
			}));
		}
		return el('div', {classList: 'facebook--card', children: children});
	}
}


class TwitterTags extends MetatagFamily {
	constructor(tagList) {
		const knownTags = {}
		const otherTags = [];
		for (let tag of tagList) {
			if (tag.name == 'twitter:title') {
				knownTags.title = tag.content;
			} else if (tag.name == 'twitter:description') {
				knownTags.description = tag.content;
			} else if (tag.name == 'twitter:image') {
				knownTags.image = tag.content;
			} else {
				otherTags.push(tag);
			}
		}
		super(otherTags);
		this.knownTags = knownTags;
	}

	static handles(tag) {
		return 'name' in tag && tag['name'].indexOf('twitter:') == 0;
	}

	static tabInfo() {
		return {
			id: 'twitter',
			name: 'Twitter',
			icon: '/icons/twitter.svg',
		};
	}

	render() {
		return el('div', {
			classList: 'twitter',
			children: [
				this.renderCard(),
				this.renderTagTable(this.tagList),
			],
		})
	}
	renderCard() {
		if (Object.keys(this.knownTags).length == 0) {
			return null;
		}

		const children = [];
		if (this.knownTags.image) {
			children.push(el('img', {
				classList: 'twitter--image',
				attrs: {'src': this.knownTags.image},
			}));
		}
		children.push(el('p', {
			classList: 'twitter--title',
			children: [this.knownTags.title]
		}));
		if (this.knownTags.description) {
			children.push(el('p', {
				classList: 'twitter--description',
				children: [this.knownTags.description],
			}));
		}
		return el('div', {classList: 'twitter--card', children: children});
	}
}


class OtherTags extends MetatagFamily {
	static handles(tag) { return true; }

	static tabInfo() {
		return {
			id: 'other',
			name: 'Other meta tags',
			icon: '/icons/share.svg',
		};
	}

	render() {
		return el('table', {
			classList: 'tag-table',
			children: this.tagList.map((tag) => el('tr', {
				children: [el('td', {children: [
					this.renderHTMLTag('meta', tag)
				]})],
			})),
		});
	}
}


const allHandlers = [
	FacebookTags,
	TwitterTags,
	OtherTags,
];


class Tabs extends RenderableMixin(Object) {
	constructor(tabs, tabState) {
		super();
		this.tabs = tabs;
		if (typeof tabState != 'object') {
			tabState = {};
		}
		this.tabState = tabState;
	}

	render() {
		this.tabBar = el('div', {classList: 'tabs--bar'});
		this.content = el('div', {classList: 'tabs--content'});
		this.el = el('div', {
			classList: 'tabs',
			children: [this.tabBar, this.content],
		});
		this.makeTabBar();

		let tabToActivate = this.tabs[0];
		for (let tab of this.tabs) {
			if (tab.id == this.tabState.activeTab) {
				tabToActivate = tab;
				break;
			}
		}
		this.activateTab(tabToActivate);

		return this.el;
	}

	makeTabBar() {
		this.tabs.forEach((tab) => {
			tab.tab = this.makeTab(tab, {
				events: {
					click: (e) => {
						e.preventDefault();
						this.activateTab(tab);
					},
				},
			});
			this.tabBar.appendChild(tab.tab);
		});
	}

	makeTab(tab, opts) {
		tab.tab = el('div', Object.assign({
			classList: 'tabs--tab',
			children: [inlineSvg(tab.icon, 'tabs--icon')],
			attrs: {'title': tab.name},
		}, opts));
		return tab.tab;
	}

	storeTabState(state) {
		Object.assign(this.tabState, state);
		browser.storage.local.set({'tabState': state})
	}
	static fetchTabState() {
		return browser.storage.local
			.get('tabState')
			.then((results) => results.tabState)
	}

	activateTab(tab) {
		if (this.activeTab) {
			this.activeTab.tab.classList.remove('active');
			this.activeTab.content.dismount();
		}

		this.activeTab = tab;

		if (this.activeTab) {
			this.activeTab.tab.classList.add('active');
			this.activeTab.content.mount(this.content);
			this.storeTabState({'activeTab': tab.id})
		}
	}
}


/**
 * Take an iterable ``iter`` and a predicate function, and return an object
 * with two arrays ``{yes: [..], no: [..]}``, where ``yes`` contains all the
 * items from ``iter`` that the predicate function returned true for, and
 * ``no`` contains all the other elements.
 */
function partition(arr, pred) {
	return Array.from(arr).reduce(function(base, item) {
		let {yes, no} = base;
		if (pred(item)) {
			yes.push(item);
		} else {
			no.push(item);
		}
		return base;
	}, {yes: [], no: []});
}


function txt(content) {
	return document.createTextNode(content);
}


function el(name, opts) {
	const element = document.createElement(name);

	if (opts.classList) {
		element.classList.add(opts.classList);
	}
	if (opts.children) {
		for (let child of opts.children) {
			if (child instanceof Node) {
				element.appendChild(child);
			} else if (child === null) {
				// Noop
			} else {
				element.appendChild(txt(child));
			}
		}
	}
	if (opts.attrs) {
		for (let [attr, val] of Object.entries(opts.attrs)) {
			element.setAttribute(attr, val);
		}
	}
	if (opts.events) {
		for (let [event, handler] of Object.entries(opts.events)) {
			element.addEventListener(event, handler);
		}
	};
	return element
}


function inlineSvg(url, classList) {
	var wrapper = el('span', {classList: (classList || 'svg')});
	fetch(browser.runtime.getURL(url))
		.then((response) => response.text())
		.then((content) => wrapper.innerHTML = content)
	return wrapper;
}


function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}


function handleTags(metaTags, tabState) {
	const popup = document.getElementById('popup-content');
	const handlers = []

	if (metaTags.length == 0) {
		popup.innerHTML = "<p><i>No meta tags found.</i></p>";
	}

	popup.innerHTML = '';

	for (const handler of allHandlers) {
		let {yes, no} = partition(metaTags, handler.handles);
		if (yes.length) {
			handlers.push(new handler(yes));

			metaTags = no;
		}
	}

	const tabs = handlers.map((handler) => handler.tab())
	new Tabs(tabs, tabState).mount(popup)
}

Promise
	.all([
		browser.tabs
			.executeScript({file: "/content_scripts/get_meta_tags.js"})
			.then((results) => results[0]),
		Tabs.fetchTabState(),
	])
	.then(([tags, tabState]) => handleTags(tags, tabState))
