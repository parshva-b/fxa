/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Cocktail from '../lib/cocktail';
import FlowEventsMixin from './mixins/flow-events-mixin';
import FormView from './form';
import Template from 'templates/subscriptions_redirect.mustache';
import PaymentServer from '../lib/payment-server';

class SubscriptionsManagementRedirectView extends FormView {
  mustAuth = true;
  template = Template;

  initialize(options) {
    this._subscriptionsConfig = {};
    if (options && options.config && options.config.subscriptions) {
      this._subscriptionsConfig = options.config.subscriptions;
    }

    // Flow events need to be initialized before the navigation
    // so the flow_id and flow_begin_time are propagated
    this.initializeFlowEvents();
  }

  afterRender() {
    return PaymentServer.navigateToPaymentServer(
      this,
      this._subscriptionsConfig,
      'subscriptions'
    );
  }
}

Cocktail.mixin(SubscriptionsManagementRedirectView, FlowEventsMixin);

export default SubscriptionsManagementRedirectView;
