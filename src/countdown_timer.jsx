import React from 'react';

// Generic Countdown Timer UI component
//
// Based on https://github.com/uken/react-countdown-timer
//
// props:
//   - initialTimeRemaining: Number|String
//       Number: The time remaining for the countdown (in seconds).
//       String: A countdown of format hh:mm:ss or mm:ss
//
//   - showMinutes: Boolean
//       Whether to show minutes in the default formatFunc (overridden by the format passed into initialTimeRemaining if provided)
//
//   - showHours: Boolean
//       Whether to show minutes in the default formatFunc (overridden by the format passed into initialTimeRemaining if provided)
//
//   - interval: Number (optional -- default: 1000ms)
//       The time between timer ticks (in ms).
//
//   - formatFunc(timeRemaining): Function (optional)
//       A function that formats the timeRemaining.
//
//   - tickCallback(timeRemaining): Function (optional)
//       A function to call each tick.
//
//   - completeCallback(): Function (optional)
//       A function to call when the countdown completes.
//
class CountdownTimer extends React.Component {

    constructor(props) {
        super(props);

        // Determine whether to show hours and minutes based on the properties passed in
        this.showMinutes = !!this.props.showMinutes && this.props.showMinutes !== 'false';
        this.showHours = !!this.props.showHours && this.props.showHours !== 'false';

        let timeRemaining = this.parseTimeString(this.props.initialTimeRemaining);
        let validTimeRemaining = !isNaN(timeRemaining);
        this.state = {
            timeRemaining: validTimeRemaining ? timeRemaining : 0,
            timeoutId: null,
            prevTime: null,
            visible: validTimeRemaining && this.props.visible
        };

        this.tick = this.tick.bind(this);
    }

    static propTypes = {
        initialTimeRemaining: React.PropTypes.string.isRequired,
        interval: React.PropTypes.number,
        formatFunc: React.PropTypes.func,
        tickCallback: React.PropTypes.func,
        completeCallback: React.PropTypes.func
    };

    static defaultProps = {
        interval: 1000,
        formatFunc: null,
        tickCallback: null,
        completeCallback: null,
        showMinutes: true,
        showHours: false
    };

    /**
     * Parse a potential time string
     * @param {string|int} time The time in HH:MM:SS format or seconds
     * @returns {int} The time in milliseconds
     */
    parseTimeString(time) {
        // Check to see whether we were passed only digits (seconds)
        if (!time.match(/[^\d]/) && !isNaN(parseInt(time, 10))) {
            return time * 1000; // Convert seconds to milliseconds
        }
        if (time.match(/:/)) {
            // Format is of type hh:mm:ss
            let segments = time.split(':');
            time = 0;
            let seconds = segments.pop();
            let minutes = segments.pop();
            let hours = segments.pop();
            if (seconds) {
                time += seconds * 1;
            }
            if (typeof minutes !== 'undefined') {
                this.showMinutes = true; // The format provided has minutes shown, so make sure we are showing them
                time += minutes * 60;
            }
            if (typeof hours !== 'undefined') {
                this.showHours = true; // The format provided has hours shown, so make sure we are showing them
                time += hours * 60 * 60;
            }
        }
        time = time * 1000; // Convert seconds to milliseconds
        return isNaN(time) ? 0 : time;
    }

    componentDidMount() {
        this.tick();
    }

    componentWillReceiveProps(newProps) {
        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
        }
        let timeRemaining = this.parseTimeString(newProps.initialTimeRemaining);
        this.setState({prevTime: null, timeRemaining: timeRemaining});
    }

    componentDidUpdate() {
        if ((!this.state.prevTime) && this.state.timeRemaining > 0) {
            this.tick();
        }
    }

    componentWillUnmount() {
        clearTimeout(this.state.timeoutId);
    }

    tick() {
        let currentTime = Date.now();
        let dt = this.state.prevTime ? (currentTime - this.state.prevTime) : 0;
        let interval = this.props.interval;

        // correct for small variations in actual timeout time
        let timeRemainingInInterval = (interval - (dt % interval));
        let timeout = timeRemainingInInterval;

        if (timeRemainingInInterval < (interval / 2.0)) {
            timeout += interval;
        }

        let timeRemaining = Math.max(this.state.timeRemaining - dt, 0);
        let countdownComplete = (this.state.prevTime && timeRemaining <= 0);

        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
        }
        this.setState({
            timeoutId: countdownComplete ? null : setTimeout(this.tick, timeout),
            prevTime: currentTime,
            timeRemaining: timeRemaining
        });

        if (countdownComplete) {
            if (this.props.completeCallback) {
                this.props.completeCallback();
            }
            return;
        }

        if (this.props.tickCallback) {
            this.props.tickCallback(timeRemaining);
        }
    }

    getFormattedTime(milliseconds) {
        if (this.props.formatFunc) {
            return this.props.formatFunc(milliseconds);
        }

        let totalSeconds = Math.round(milliseconds / 1000);

        let seconds = parseInt(totalSeconds % 60, 10);
        let minutes = parseInt(totalSeconds / 60, 10) % 60;
        let hours = parseInt(totalSeconds / 3600, 10);

        seconds = seconds < 10 ? '0' + seconds : seconds;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        hours = hours < 10 ? '0' + hours : hours;

        let response = '';
        if (this.showHours) {
            response += hours + ':';
        }
        if (this.showHours || this.showMinutes) {
            response += minutes + ':';
        }
        response += seconds;

        return response;
    }

    render() {
        let style = {};
        if (!this.props.visible) {
            style.display = 'none';
        }
        return (
            <span className="timer" style={style}>
                {this.getFormattedTime(this.state.timeRemaining)}
            </span>
        );
    }
}

module.exports = CountdownTimer;